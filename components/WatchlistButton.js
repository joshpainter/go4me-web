import { useState, useEffect, useCallback } from 'react'
import { Icon } from 'semantic-ui-react'
import { getWatchlistData, setWatchlistData, STORAGE_KEY } from '../lib/watchlistStorage'

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

  // Use global notification system
  const showNotification = useCallback((message, isSuccess = true) => {
    // Dispatch to global notification system (non-persistent, auto-close)
    if (typeof window !== 'undefined' && window.globalShowNotification) {
      window.globalShowNotification(message, isSuccess, { isPersistent: false })
    }
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
