import React, { useState, useEffect, useRef } from 'react'

// Type definitions
interface BadgeData {
  name: string
  emoji: string
  points: number
}

interface CachedBadge {
  data: BadgeData
  timestamp: number
}

interface UserOfferMapping {
  offerId: string
  timestamp: number
}

interface QueuedRequest {
  offerId: string
  resolve: (value: BadgeData) => void
  reject: (reason: Error) => void
}

interface UserBadgeDisplayProps {
  lastOfferId?: string
  lastOfferStatus?: number
  userId?: string | number
  className?: string
}

// Cache configuration constants
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes in milliseconds
const CACHE_KEY_PREFIX = 'badge_cache_'
const USER_OFFER_CACHE_KEY = 'user_offer_mapping_'
const REQUEST_TIMEOUT = 10000 // 10 seconds
const ERROR_RETRY_DELAY = 30000 // 30 seconds
const CLEANUP_BATCH_SIZE = 10 // Max entries to clean per batch

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (error) {
    return false
  }
}

// Helper functions for localStorage cache
const getCachedBadge = (offerId: string): CachedBadge | null => {
  if (!isLocalStorageAvailable()) return null

  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + offerId)
    if (!cached) return null

    const { data, timestamp }: CachedBadge = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY_PREFIX + offerId)
      return null
    }

    return { data, timestamp }
  } catch (error) {
    return null
  }
}

const setCachedBadge = (offerId: string, data: BadgeData): void => {
  if (!isLocalStorageAvailable()) return

  try {
    // Validate data before caching
    if (!data || typeof data !== 'object') return

    // Sanitize offerId to prevent potential issues
    const sanitizedOfferId = String(offerId).replace(/[^a-zA-Z0-9_-]/g, '')
    if (!sanitizedOfferId) return

    const cacheEntry: CachedBadge = {
      data,
      timestamp: Date.now()
    }

    localStorage.setItem(CACHE_KEY_PREFIX + sanitizedOfferId, JSON.stringify(cacheEntry))
  } catch (error) {
    // Silently handle localStorage errors (quota exceeded, disabled, etc.)
  }
}

const clearCachedBadge = (offerId: string): void => {
  try {
    localStorage.removeItem(CACHE_KEY_PREFIX + offerId)
  } catch (error) {
    // Ignore localStorage errors
  }
}

// Helper functions for user-offer mapping
const getUserOfferMapping = (userId: string | number): UserOfferMapping | null => {
  try {
    const cached = localStorage.getItem(USER_OFFER_CACHE_KEY + userId)
    return cached ? JSON.parse(cached) as UserOfferMapping : null
  } catch (error) {
    return null
  }
}

const setUserOfferMapping = (userId: string | number, offerId: string): void => {
  try {
    const mapping: UserOfferMapping = {
      offerId,
      timestamp: Date.now()
    }
    localStorage.setItem(USER_OFFER_CACHE_KEY + userId, JSON.stringify(mapping))
  } catch (error) {
    // Ignore localStorage errors
  }
}

const clearUserOfferMapping = (userId: string | number): void => {
  try {
    localStorage.removeItem(USER_OFFER_CACHE_KEY + userId)
  } catch (error) {
    // Ignore localStorage errors
  }
}

// Clean up expired cache entries to prevent localStorage bloat (optimized)
const cleanupExpiredCache = (): void => {
  try {
    // Use requestIdleCallback for non-blocking cleanup
    const performCleanup = (): void => {
      const keys = Object.keys(localStorage)
      const now = Date.now()
      let cleanedCount = 0

      // Process in batches to avoid blocking
      for (let i = 0; i < keys.length && cleanedCount < CLEANUP_BATCH_SIZE; i++) {
        const key = keys[i]
        if (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith(USER_OFFER_CACHE_KEY)) {
          try {
            const cachedItem = localStorage.getItem(key)
            if (cachedItem) {
              const cached = JSON.parse(cachedItem)
              if (cached && cached.timestamp && (now - cached.timestamp > CACHE_DURATION)) {
                localStorage.removeItem(key)
                cleanedCount++
              }
            }
          } catch (error) {
            // Remove corrupted cache entries
            localStorage.removeItem(key)
            cleanedCount++
          }
        }
      }
    }

    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(performCleanup, { timeout: 1000 })
    } else {
      setTimeout(performCleanup, 100)
    }
  } catch (error) {
    // Ignore localStorage errors
  }
}

// Run cleanup on component load (throttled to once per session)
let cleanupRun = false
let cleanupInProgress = false
const runCleanupOnce = () => {
  if (!cleanupRun && !cleanupInProgress) {
    cleanupRun = true
    cleanupInProgress = true
    cleanupExpiredCache()
    // Reset flag after cleanup completes
    setTimeout(() => { cleanupInProgress = false }, 2000)
  }
}

// Request queue to handle rate limiting (optimized for performance)
const requestQueue: QueuedRequest[] = []
let isProcessingQueue = false
let requestCount = 0
let lastProcessTime = 0
const REQUEST_DELAY = 800 // 800ms delay between requests
const REQUEST_BATCH_SIZE = 300 // Back off every 300 requests
const BATCH_BACKOFF_TIME = 2000 // 2 seconds backoff after batch requests
const RATE_LIMIT_BACKOFF_TIME = 10000 // 10 seconds backoff for 429 errors
const MIN_PROCESS_INTERVAL = 100 // Minimum time between queue processing attempts

// Process the request queue with rate limiting (optimized for performance)
const processQueue = async (): Promise<void> => {
  const now = Date.now()

  // Throttle queue processing to prevent excessive calls
  if (isProcessingQueue || requestQueue.length === 0 || (now - lastProcessTime < MIN_PROCESS_INTERVAL)) {
    return
  }

  isProcessingQueue = true
  lastProcessTime = now

  try {
    while (requestQueue.length > 0) {
      const queuedRequest = requestQueue.shift()
      if (!queuedRequest) continue

      const { offerId, resolve, reject } = queuedRequest

      // Check cache first
      const cached = getCachedBadge(offerId)
      if (cached) {
        resolve(cached.data)
        continue
      }

      // Check if we need to back off after batch size requests
      if (requestCount > 0 && requestCount % REQUEST_BATCH_SIZE === 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_BACKOFF_TIME))
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

        const response = await fetch(`/api/mintgarden-proxy?offerId=${offerId}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        requestCount++

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Failed to fetch badge info: ${response.status} - ${errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()
        const badgeData = data.badge

        // Validate badge data structure
        if (badgeData && typeof badgeData === 'object' && badgeData.name) {
          // Cache the result asynchronously to avoid blocking
          setTimeout(() => setCachedBadge(offerId, badgeData), 0)
          resolve(badgeData)
        } else {
          reject(new Error('Invalid badge data received'))
        }
      } catch (error) {
        // Handle 429 rate limit errors with backoff
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF_TIME))
          // Retry the request after backoff
          requestQueue.unshift({ offerId, resolve, reject })
          continue
        } else {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }

      // Non-blocking delay before processing next request
      if (requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY))
      }
    }
  } finally {
    isProcessingQueue = false
  }
}

// Debounced queue processing to reduce message handler load
let processQueueTimeout: NodeJS.Timeout | null = null

const debouncedProcessQueue = () => {
  if (processQueueTimeout) {
    clearTimeout(processQueueTimeout)
  }
  processQueueTimeout = setTimeout(() => {
    processQueue()
    processQueueTimeout = null
  }, 10) // 10ms debounce
}

// Queue a request for badge data
const queueBadgeRequest = (offerId: string): Promise<BadgeData> => {
  return new Promise<BadgeData>((resolve, reject) => {
    requestQueue.push({ offerId, resolve, reject })
    debouncedProcessQueue()
  })
}

const UserBadgeDisplay: React.FC<UserBadgeDisplayProps> = ({
  lastOfferId,
  lastOfferStatus,
  userId,
  className = ''
}) => {
  const [badgeInfo, setBadgeInfo] = useState<BadgeData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef<boolean>(true)
  const elementRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    mountedRef.current = true
    // Run cache cleanup once per session
    runCleanupOnce()

    return () => {
      mountedRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  // Intersection Observer for lazy loading (ultra-optimized)
  useEffect(() => {
    const element = elementRef.current
    if (!element || isVisible) return

    // Use requestIdleCallback to defer observer setup
    const setupObserver = () => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            // Disconnect observer immediately to save resources
            observer.disconnect()
          }
        },
        {
          rootMargin: '50px', // Reduced margin for better performance
          threshold: 0.01 // Lower threshold for faster triggering
        }
      )

      observer.observe(element)
      return observer
    }

    let observer: IntersectionObserver | null = null

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        if (elementRef.current && !isVisible) {
          observer = setupObserver()
        }
      }, { timeout: 100 })
    } else {
      observer = setupObserver()
    }

    return () => {
      if (observer) {
        observer.disconnect()
      }
    }
  }, [isVisible])

  useEffect(() => {
    // If there's no offer or offer is not active (status !== 0), don't show badge and clear cache
    if (!lastOfferId || lastOfferStatus !== 0) {
      // Clear any cached badge data for this offer
      if (lastOfferId) {
        clearCachedBadge(lastOfferId)
      }
      // Clear user-offer mapping if user ID is available
      if (userId) {
        clearUserOfferMapping(userId)
      }
      setBadgeInfo(null)
      setError(null)
      setLoading(false)
      return
    }

    // Check if offer ID has changed for this user (optimized)
    if (userId) {
      const previousMapping = getUserOfferMapping(userId)
      if (previousMapping && previousMapping.offerId !== lastOfferId) {
        // Offer ID changed, clear old cache asynchronously
        setTimeout(() => clearCachedBadge(previousMapping.offerId), 0)
      }
      // Update the mapping asynchronously to avoid blocking
      setTimeout(() => setUserOfferMapping(userId, lastOfferId), 0)
    }

    if (!isVisible) return

    const fetchBadgeInfo = async (isRetry: boolean = false): Promise<void> => {
      if (!lastOfferId) return

      // Check cache first
      const cached = getCachedBadge(lastOfferId)

      if (cached && !isRetry) {
        setBadgeInfo(cached.data)

        // Set up auto-retry when cache expires
        const timeUntilExpiry = CACHE_DURATION - (Date.now() - cached.timestamp)
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            fetchBadgeInfo(true)
          }
        }, timeUntilExpiry)

        return
      }

      if (!isRetry) {
        setLoading(true)
        setError(null)
      }

      try {
        // Use the queue to handle rate limiting
        const badgeData = await queueBadgeRequest(lastOfferId)

        // Badge data is already cached in queueBadgeRequest

        if (mountedRef.current) {
          setBadgeInfo(badgeData)
          setError(null)

          // Set up auto-retry for next cache expiry
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              fetchBadgeInfo(true)
            }
          }, CACHE_DURATION)
        }

      } catch (err) {
        if (mountedRef.current) {
          // Don't expose internal error details to users
          setError('Unable to load badge')

          // Retry after delay on error
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              fetchBadgeInfo(true)
            }
          }, ERROR_RETRY_DELAY)
        }
      } finally {
        if (mountedRef.current && !isRetry) {
          setLoading(false)
        }
      }
    }

    fetchBadgeInfo()

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [lastOfferId, lastOfferStatus, userId, isVisible])

  if (loading) {
    return <span ref={elementRef} className={`badge-loading ${className}`}>⏳</span>
  }

  if (error) {
    return <span ref={elementRef} className={`badge-error ${className}`} title={error}>❓</span>
  }

  if (!badgeInfo) {
    return <span ref={elementRef} className={`badge-placeholder ${className}`}>⏳</span>
  }

  return (
    <span
      ref={elementRef}
      className={`badge-display ${className}`}
      title={`${badgeInfo.name} badge (${badgeInfo.points} $G4M points)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 500
      }}
    >
      <span style={{ fontSize: 14 }}>{badgeInfo.emoji}</span>
      <span>{badgeInfo.name}</span>
      <span style={{
        fontSize: 10,
        opacity: 0.8,
        marginLeft: 2
      }}>
        ({badgeInfo.points} $G4M)
      </span>
    </span>
  )
}

export default UserBadgeDisplay
