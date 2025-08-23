// Shared watchlist storage utilities
// Used by WatchlistButton, OfferMonitorStatus, and OfferMonitor

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

export const getWatchlistData = () => {
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

export { STORAGE_KEY, isProduction }
