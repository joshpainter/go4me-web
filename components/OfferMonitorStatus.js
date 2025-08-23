import { useState, useEffect } from 'react'
import { Icon } from 'semantic-ui-react'

export default function OfferMonitorStatus() {
  const [starredCount, setStarredCount] = useState(0)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (typeof window !== 'undefined') {
      updateStatus()

      // Listen for changes to starred users
      const handleChange = () => {
        updateStatus()
      }

      window.addEventListener('watchlistChanged', handleChange)
      window.addEventListener('storage', (e) => {
        if (e.key === 'go4me_watchlist') {
          updateStatus()
        }
      })

      return () => {
        window.removeEventListener('watchlistChanged', handleChange)
        window.removeEventListener('storage', handleChange)
      }
    }
  }, [])

  const updateStatus = () => {
    if (typeof window === 'undefined') return

    try {
      const watchlist = localStorage.getItem('go4me_watchlist')
      const starred = watchlist ? JSON.parse(watchlist) : []
      setStarredCount(starred.length)
      setIsMonitoring(starred.length > 0)
    } catch (error) {
      console.error('Error updating offer monitor status:', error)
      setStarredCount(0)
      setIsMonitoring(false)
    }
  }

  if (!isClient || starredCount === 0) {
    return null // Don't show anything if no starred users
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: isMonitoring ? '#28a745' : '#6c757d',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
      title={`Monitoring ${starredCount} starred user${starredCount !== 1 ? 's' : ''} for new offers`}
    >
      <Icon
        name={isMonitoring ? 'bell' : 'bell outline'}
        style={{ margin: 0, fontSize: '12px' }}
      />
      <span>
        Monitoring {starredCount} user{starredCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
