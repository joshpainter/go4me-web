import { getSupabaseClient } from './supabaseClient'

const LAST_CHECK_STORAGE_KEY = 'go4me_last_offer_check'
const SEEN_OFFERS_STORAGE_KEY = 'go4me_seen_offers'



export class OfferMonitor {
  constructor(showNotification) {
    this.showNotification = showNotification
    this.isMonitoring = false
    this.intervalId = null
    this.checkInterval = 45000 // 45 seconds to be respectful of API limits
  }

  // Start monitoring starred users for new offers
  startMonitoring() {
    if (this.isMonitoring) {
      // Already monitoring, skip start
      return
    }

    if (typeof window === 'undefined') return

    const starredUsers = this.getStarredUsers()
    if (starredUsers.length === 0) {
      // No starred users, skip monitoring
      return
    }

    // Prevent race conditions by checking again after getting users
    if (this.isMonitoring) {
      // Race condition detected, already monitoring
      return
    }

    this.isMonitoring = true
    // Started monitoring users for new offers

    // Clear any existing interval first
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    // Check immediately, then set interval
    this.checkForNewOffers()
    this.intervalId = setInterval(() => {
      this.checkForNewOffers()
    }, this.checkInterval)
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isMonitoring = false
    // Stopped offer monitoring
  }

  // Get starred users from storage (localStorage in dev, cookies in production)
  getStarredUsers() {
    if (typeof window === 'undefined') return []

    try {
      const isProduction = !window.location.hostname.includes('localhost')
      let data

      if (isProduction) {
        // Use cookies in production
        data = this.getCookie('go4me_watchlist')
      } else {
        // Use localStorage in development
        data = localStorage.getItem('go4me_watchlist')
      }

      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('[OfferMonitor] Error loading starred users:', error)
      return []
    }
  }

  // Cookie utility for production
  getCookie(name) {
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

  // Get seen offers to avoid duplicate notifications
  getSeenOffers() {
    if (typeof window === 'undefined') return new Set()
    
    try {
      const seen = localStorage.getItem(SEEN_OFFERS_STORAGE_KEY)
      return new Set(seen ? JSON.parse(seen) : [])
    } catch (error) {
      console.error('[OfferMonitor] Error loading seen offers:', error)
      return new Set()
    }
  }

  // Save seen offers
  saveSeenOffers(seenOffers) {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(SEEN_OFFERS_STORAGE_KEY, JSON.stringify([...seenOffers]))
    } catch (error) {
      console.error('[OfferMonitor] Error saving seen offers:', error)
    }
  }

  // Get last check timestamp
  getLastCheckTime() {
    if (typeof window === 'undefined') return 0
    
    try {
      const lastCheck = localStorage.getItem(LAST_CHECK_STORAGE_KEY)
      return lastCheck ? parseInt(lastCheck) : 0
    } catch (error) {
      console.error('[OfferMonitor] Error loading last check time:', error)
      return 0
    }
  }

  // Save last check timestamp
  saveLastCheckTime() {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(LAST_CHECK_STORAGE_KEY, Date.now().toString())
    } catch (error) {
      console.error('[OfferMonitor] Error saving last check time:', error)
    }
  }

  // Check for new offers on starred users
  async checkForNewOffers() {
    if (this._checking) {
      return // prevent overlapping checks
    }
    this._checking = true
    const starredUsers = this.getStarredUsers()
    if (starredUsers.length === 0) {
      this.stopMonitoring()
      return
    }

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        // Supabase client not available
        return
      }

      // Get current offer data for starred users
      const starredUserIds = starredUsers
        .map(user => user.id)
        .filter(id => id && id !== 'undefined' && id !== 'null') // Filter out invalid IDs

      if (starredUserIds.length === 0) {
        // No valid user IDs to monitor
        return
      }

      const { data: currentData, error } = await supabase
        .from('get_leaderboard')
        .select('author_id, username, name, last_offerid, last_offer_status, pfp_ipfs_cid')
        .in('author_id', starredUserIds)

      if (error) {
        console.error('[OfferMonitor] Error fetching offer data:', error)
        return
      }

      if (!currentData || currentData.length === 0) {
        // No data returned for starred users
        return
      }

      const seenOffers = this.getSeenOffers()
      const newOffers = []

      // Check each starred user for new offers
      for (const userData of currentData) {
        if (userData.last_offerid && userData.last_offer_status === 0) {
          const offerKey = `${userData.author_id}_${userData.last_offerid}`

          if (!seenOffers.has(offerKey)) {
            // This is a new offer we haven't seen before
            const starredUser = starredUsers.find(u => u.id === userData.author_id)
            if (starredUser) {
              // Check if this user was recently starred (within last 5 minutes)
              // If so, mark existing offers as seen but don't notify
              const starredAt = new Date(starredUser.starredAt).getTime()
              const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)

              if (starredAt > fiveMinutesAgo) {
                // User was recently starred, just mark offer as seen without notification
                seenOffers.add(offerKey)
              } else {
                // User was starred a while ago, this is a genuinely new offer
                newOffers.push({
                  userId: userData.author_id,
                  username: userData.username,
                  fullName: userData.name,
                  offerId: userData.last_offerid,
                  offerKey,
                  pfpCid: userData.pfp_ipfs_cid
                })
                seenOffers.add(offerKey)
              }
            }
          }
        }
      }

      // Show notifications for new offers
      if (newOffers.length > 0) {
        // Found new offers
        
        for (const offer of newOffers) {
          this.showOfferNotification(offer)
        }
        
        // Save updated seen offers
        this.saveSeenOffers(seenOffers)
      }

      // Update last check time
      this.saveLastCheckTime()

    } catch (error) {
      console.error('[OfferMonitor] Error checking for new offers:', error)
    } finally {
      this._checking = false
    }
  }

  // Sanitize display name to prevent XSS
  sanitizeDisplayName(name) {
    if (!name || typeof name !== 'string') return 'Unknown User'
    // Remove any HTML tags and limit length
    return name.replace(/<[^>]*>/g, '').trim().substring(0, 50)
  }

  // Show notification for a new offer
  showOfferNotification(offer) {
    const displayName = this.sanitizeDisplayName(offer.fullName || offer.username)
    const message = `💰 New offer on ${displayName}'s NFT!`

    // Build dynamic Dexie link with actual offer ID
    const dexieLink = offer.offerId ?
      `https://dexie.space/offers/${offer.offerId}` :
      'https://dexie.space'

    if (this.showNotification) {
      this.showNotification(message, true, {
        isPersistent: true,
        link: dexieLink
      })
    }
  }

  // Clean up old seen offers (keep only last 1000 to prevent storage bloat)
  cleanupSeenOffers() {
    if (typeof window === 'undefined') return
    
    try {
      const seenOffers = this.getSeenOffers()
      if (seenOffers.size > 1000) {
        // Convert to array, keep last 800, convert back to Set
        const offersArray = [...seenOffers]
        const trimmedOffers = new Set(offersArray.slice(-800))
        this.saveSeenOffers(trimmedOffers)
        // Cleaned up seen offers storage
      }
    } catch (error) {
      console.error('[OfferMonitor] Error cleaning up seen offers:', error)
    }
  }

  // Update monitoring when starred users change
  updateStarredUsers() {
    const starredUsers = this.getStarredUsers()
    const hasStarred = starredUsers.length > 0

    if (!hasStarred && this.isMonitoring) {
      this.stopMonitoring()
      return
    }

    if (hasStarred && !this.isMonitoring) {
      this.startMonitoring()
      return
    }

    // If we reach here, state didn't change; do nothing to avoid spam
  }
}
