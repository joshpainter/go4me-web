// Shared watchlist storage utilities
// Used by WatchlistButton, OfferMonitorStatus, and OfferMonitor

const STORAGE_KEY = 'go4me_watchlist'

// Detect if we're in development or production
const isProduction = () => {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  // Consider it production only if it's a real go4.me domain with HTTPS
  return hostname.endsWith('.go4.me') && window.location.protocol === 'https:'
}

// Get the root domain for cookie sharing
const getRootDomain = () => {
  if (typeof window === 'undefined') return ''

  const hostname = window.location.hostname

  // For any go4.me domain (production or local), extract root domain
  if (hostname.includes('go4.me')) {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.')
    }
  }

  // For other domains, no cross-domain sharing
  return ''
}

// Cookie utilities for cross-subdomain storage in production
const setCookie = (name, value, days = 90) => {
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
export const setWatchlistData = (data) => {
  if (typeof window === 'undefined') return

  try {
    const hostname = window.location.hostname

    if (isProduction()) {
      // Use cookies in production for cross-subdomain sharing
      setCookie(STORAGE_KEY, JSON.stringify(data))
    } else if (hostname.includes('go4.me')) {
      // For local go4.me domains (like the_300_SPTN.go4.me), use both localStorage and cookies
      // This ensures cross-subdomain sharing in development
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setCookie(STORAGE_KEY, JSON.stringify(data))
    } else {
      // Use localStorage for localhost and other development domains
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

export const getWatchlistData = () => {
  if (typeof window === 'undefined') return []

  try {
    const hostname = window.location.hostname
    let data

    if (isProduction()) {
      // Use cookies in production
      data = getCookie(STORAGE_KEY)
    } else if (hostname.includes('go4.me')) {
      // For local go4.me domains, try cookies first, then localStorage
      data = getCookie(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
    } else {
      // Use localStorage for localhost and other development domains
      data = localStorage.getItem(STORAGE_KEY)
    }

    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error getting watchlist data:', error)
    return []
  }
}

export { STORAGE_KEY, isProduction }
