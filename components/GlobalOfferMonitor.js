import { useEffect, useRef, useCallback } from 'react'
import { OfferMonitor } from '../lib/offerMonitor'

// Global singleton to prevent multiple instances
let globalMonitorInstance = null
let globalMonitorRefCount = 0

export default function GlobalOfferMonitor() {
  const monitorRef = useRef(null)

  // Validate URL to prevent XSS
  const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false
    try {
      const urlObj = new URL(url)
      // Only allow https URLs from trusted domains
      return urlObj.protocol === 'https:' &&
             (urlObj.hostname === 'dexie.space' || urlObj.hostname === 'mintgarden.io')
    } catch {
      return false
    }
  }

  const showNotification = useCallback((message, isSuccess = true, options = {}) => {
    const { isPersistent = false, link = null } = options

    // Validate link if provided
    const validatedLink = link && isValidUrl(link) ? link : null

    // Calculate position to avoid stacking
    const existingNotifications = document.querySelectorAll('.go4me-notification')
    const topOffset = 20 + (existingNotifications.length * 80) // Stack notifications

    // Create notification container
    const notification = document.createElement('div')
    notification.className = 'go4me-notification'
    notification.style.cssText = `
      position: fixed;
      top: ${topOffset}px;
      right: 20px;
      background: ${isSuccess ? '#28a745' : '#dc3545'};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 320px;
      animation: slideIn 0.3s ease-out;
      display: flex;
      flex-direction: column;
      gap: 8px;
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
        .notification-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          margin-left: auto;
          opacity: 0.8;
        }
        .notification-close:hover {
          opacity: 1;
        }
        .notification-link {
          color: white;
          text-decoration: underline;
          font-weight: 600;
        }
        .notification-link:hover {
          text-decoration: none;
        }
      `
      document.head.appendChild(style)
    }

    // Create message content
    const messageDiv = document.createElement('div')
    messageDiv.style.cssText = `
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    `

    const textDiv = document.createElement('div')
    textDiv.textContent = message
    textDiv.style.flex = '1'

    // Add close button for persistent notifications
    if (isPersistent) {
      const closeButton = document.createElement('button')
      closeButton.innerHTML = '×'
      closeButton.className = 'notification-close'
      closeButton.onclick = () => {
        notification.style.animation = 'slideOut 0.3s ease-in'
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 300)
      }
      messageDiv.appendChild(textDiv)
      messageDiv.appendChild(closeButton)
    } else {
      messageDiv.appendChild(textDiv)
    }

    notification.appendChild(messageDiv)

    // Add link if provided and valid
    if (validatedLink) {
      const linkElement = document.createElement('a')
      linkElement.href = validatedLink
      linkElement.target = '_blank'
      linkElement.rel = 'noopener noreferrer'
      linkElement.textContent = 'View on Dexie →'
      linkElement.className = 'notification-link'
      notification.appendChild(linkElement)
    }

    document.body.appendChild(notification)

    // Auto-remove non-persistent notifications after 3 seconds
    if (!isPersistent) {
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in'
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 300)
      }, 3000)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Increment reference count
    globalMonitorRefCount++

    // Initialize the offer monitor once globally using singleton pattern
    if (!globalMonitorInstance) {
      globalMonitorInstance = new OfferMonitor(showNotification)
    }

    // Store reference locally
    monitorRef.current = globalMonitorInstance

    // Start monitoring if there are starred users
    const checkAndStartMonitoring = () => {
      if (monitorRef.current) {
        monitorRef.current.updateStarredUsers()
      }
    }

    // Check immediately
    checkAndStartMonitoring()

    // Stable listeners
    const handleWatchlistChange = () => {
      if (monitorRef.current) {
        monitorRef.current.updateStarredUsers()
      }
    }

    const handleStorageChange = (e) => {
      if (e.key === 'go4me_watchlist' && monitorRef.current) {
        monitorRef.current.updateStarredUsers()
      }
    }

    window.addEventListener('watchlistChanged', handleWatchlistChange, { passive: true })
    window.addEventListener('storage', handleStorageChange, { passive: true })

    // Cleanup on unmount
    return () => {
      // Decrement reference count
      globalMonitorRefCount--

      window.removeEventListener('watchlistChanged', handleWatchlistChange)
      window.removeEventListener('storage', handleStorageChange)

      // Only destroy the singleton when no more references exist
      if (globalMonitorRefCount <= 0 && globalMonitorInstance) {
        globalMonitorInstance.stopMonitoring()
        globalMonitorInstance = null
        globalMonitorRefCount = 0 // Reset to prevent negative counts
      }

      monitorRef.current = null
    }
  }, [showNotification])

  // This component doesn't render anything visible
  return null
}
