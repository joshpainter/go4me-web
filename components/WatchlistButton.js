import { useState, useEffect, useCallback } from 'react'
import { Icon } from 'semantic-ui-react'

// Cross-subdomain storage utilities for production
const STORAGE_KEY = 'go4me_watchlist'

// Detect if we're in development or production
const isProduction = () => {
  if (typeof window === 'undefined') return false
  return !window.location.hostname.includes('localhost')
}

// Get the root domain for cookie sharing
const getRootDomain = () => {
  if (typeof window === 'undefined') return ''

  const hostname = window.location.hostname

  // In production, extract root domain (e.g., 'go4.me' from 'user.go4.me')
  if (isProduction()) {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.')
    }
  }

  // In development, fall back to localStorage
  return ''
}

// Cookie utilities for cross-subdomain storage in production
const setCookie = (name, value, days = 90) => { // Reduced from 365 to 90 days for better security
  if (typeof document === 'undefined') return

  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))

  const rootDomain = getRootDomain()
  const domainPart = rootDomain ? `;domain=${rootDomain}` : ''

  // Add Secure flag for HTTPS in production
  const securePart = (isProduction() && window.location.protocol === 'https:') ? ';Secure' : ''

  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/${domainPart};SameSite=Lax${securePart}`
}

const getCookie = (name) => {
  if (typeof document === 'undefined') return null

  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

// Storage functions that work in both development and production
const setWatchlistData = (data) => {
  if (typeof window === 'undefined') return

  try {
    if (isProduction()) {
      // Use cookies in production for cross-subdomain sharing
      setCookie(STORAGE_KEY, JSON.stringify(data))
    } else {
      // Use localStorage in development
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  } catch (error) {
    console.error('Error setting watchlist data:', error)
    // If storage fails, show user-friendly message
    if (error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please clear some browser data and try again.')
    }
  }
}

const getWatchlistData = () => {
  if (typeof window === 'undefined') return []

  try {
    let data
    if (isProduction()) {
      // Use cookies in production
      data = getCookie(STORAGE_KEY)
    } else {
      // Use localStorage in development
      data = localStorage.getItem(STORAGE_KEY)
    }

    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error getting watchlist data:', error)
    return []
  }
}

export default function WatchlistButton({ user }) {
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [isClient, setIsClient] = useState(false)



  // Load watchlist state and listen for changes
  useEffect(() => {
    setIsClient(true)
    if (typeof window !== 'undefined') {
      const loadWatchlistState = () => {
        try {
          const watchlist = getWatchlistData()
          const isStarred = watchlist.some(item => item.id === user.id)
          setIsInWatchlist(isStarred)

          // State loaded
        } catch (error) {
          console.error('Error loading watchlist:', error)
        }
      }

      loadWatchlistState()

      // Listen for storage changes to sync across tabs/pages
      const handleStorageChange = (e) => {
        if (e.key === STORAGE_KEY) {
          loadWatchlistState()
        }
      }

      // Listen for custom events for same-page updates
      const handleWatchlistChange = () => {
        loadWatchlistState()
      }

      // Listen for focus events to check localStorage when returning to tab
      const handleFocus = () => {
        loadWatchlistState()
      }

      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('watchlistChanged', handleWatchlistChange)
      window.addEventListener('focus', handleFocus)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('watchlistChanged', handleWatchlistChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [user.id])

  const showNotification = useCallback((message, isSuccess = true) => {
    // Simple toast-like notification
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${isSuccess ? '#28a745' : '#dc3545'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `

    // Add CSS animation
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style')
      style.id = 'notification-styles'
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    notification.textContent = message
    document.body.appendChild(notification)

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }, [])



  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (typeof window === 'undefined') return

    // Safety check for user ID
    if (!user || !user.id) {
      console.error('WatchlistButton: Cannot star user without ID:', user)
      showNotification('Error: User ID missing', false)
      return
    }

    try {
      const watchlist = getWatchlistData()

      if (isInWatchlist) {
        // Remove from starred
        const filtered = watchlist.filter(item => item.id !== user.id)
        setWatchlistData(filtered)
        setIsInWatchlist(false)

        // Show notification
        showNotification(`🔔 Notifications disabled for ${user.username}`)

        // Dispatch custom event for same-page updates
        window.dispatchEvent(new CustomEvent('watchlistChanged', {
          detail: { action: 'remove', userId: user.id }
        }))
      } else {
        // Add to starred
        const starredItem = {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          starredAt: new Date().toISOString()
        }
        watchlist.push(starredItem)
        setWatchlistData(watchlist)
        setIsInWatchlist(true)

        // Show notification
        showNotification(`🔔 Notifications enabled for ${user.username}!`)

        // Dispatch custom event for same-page updates
        window.dispatchEvent(new CustomEvent('watchlistChanged', {
          detail: { action: 'add', userId: user.id, user: starredItem }
        }))
      }
    } catch (error) {
      console.error('Error updating starred users:', error)
      showNotification('Error updating star', false)
    }
  }

  if (!isClient) {
    return null // Don't render on server side
  }

  return (
    <Icon
      name={isInWatchlist ? 'bell' : 'bell outline'}
      color={isInWatchlist ? 'yellow' : 'grey'}
      style={{ cursor: 'pointer', fontSize: '1.2em' }}
      onClick={handleClick}
      title={isInWatchlist ? `Stop notifications for ${user.username}` : `Get notifications for ${user.username}`}
    />
  )
}
