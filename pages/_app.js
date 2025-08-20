import 'semantic-ui-css/semantic.min.css'
import '../styles/globals.css'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { WalletConnectProvider } from '../lib/wallet/WalletConnectContext'
import { JsonRpcProvider } from '../lib/wallet/JsonRpcContext'
import { GobyProvider } from '../lib/wallet/GobyContext'
import { ToastProvider } from '../components/ui/Toast'

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

function MyApp({ Component, pageProps }) {
  const [theme, setTheme] = useState('light')

  // Initialize theme on mount (avoids SSR mismatch issues)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme')
      const preferred = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      setTheme(preferred)
      document.documentElement.setAttribute('data-theme', preferred)
    } catch {}

    let cleanupFn

    // Only enable error suppression in production to keep dev snappy
    if (process.env.NODE_ENV === 'production') {
      // Ultra-optimized WalletConnect error suppression with caching and fast string matching
      const errorCache = new Map()
      const maxCacheSize = 100

      // Use simple string includes for faster matching than regex
      const walletConnectKeywords = [
        'No matching key',
        'pairing: undefined',
        'cleanupDuplicatePairings',
        'onSessionSettleRequest',
        'getData',
        'getRecord',
        'onRelayEventResponse',
        'core/pairing',
        'history:',
        'webpack-internal',
        '@walletconnect/core',
        '@walletconnect/sign-client'
      ]

      const isWalletConnectError = (message) => {
        if (!message || typeof message !== 'string') return false

        // Check cache first
        if (errorCache.has(message)) {
          return errorCache.get(message)
        }

        // Fast string matching instead of regex
        const isError = walletConnectKeywords.some(keyword => message.includes(keyword))

        // Cache result with size limit
        if (errorCache.size >= maxCacheSize) {
          const firstKey = errorCache.keys().next().value
          errorCache.delete(firstKey)
        }
        errorCache.set(message, isError)

        return isError
      }

      // Override window.onerror to catch all errors
      const originalOnError = window.onerror
      window.onerror = (message, source, lineno, colno, error) => {
        const errorMessage = String(message || error?.message || error || '')
        if (isWalletConnectError(errorMessage) || isWalletConnectError(source || '')) {
          return true // Prevent default error handling
        }
        if (originalOnError) return originalOnError(message, source, lineno, colno, error)
        return false
      }

      // Override console methods to suppress WalletConnect noise
      const originalConsoleError = console.error
      const originalConsoleWarn = console.warn
      const originalConsoleLog = console.log

      console.error = (...args) => {
        // Ultra-fast early exit - check for common WalletConnect strings first
        const firstArg = args[0]
        if (typeof firstArg === 'string' && (
          firstArg.includes('@walletconnect') ||
          firstArg.includes('pairing:') ||
          firstArg.includes('No matching key')
        )) {
          if (isWalletConnectError(firstArg)) return
        }
        originalConsoleError.apply(console, args)
      }

      console.warn = (...args) => {
        // Ultra-fast early exit - check for common WalletConnect strings first
        const firstArg = args[0]
        if (typeof firstArg === 'string' && (
          firstArg.includes('@walletconnect') ||
          firstArg.includes('pairing:') ||
          firstArg.includes('No matching key')
        )) {
          if (isWalletConnectError(firstArg)) return
        }
        originalConsoleWarn.apply(console, args)
      }

      console.log = (...args) => {
        // Ultra-fast early exit - check for common WalletConnect strings first
        const firstArg = args[0]
        if (typeof firstArg === 'string' && (
          firstArg.includes('@walletconnect') ||
          firstArg.includes('pairing:') ||
          firstArg.includes('No matching key')
        )) {
          if (isWalletConnectError(firstArg)) return
        }
        originalConsoleLog.apply(console, args)
      }

      // Suppress Next.js dev overlay errors for WalletConnect
      if (typeof window !== 'undefined' && window.__NEXT_DATA__?.buildId) {
        const originalNextJsError = window.console.error
        window.console.error = (...args) => {
          const message = args.join(' ')
          if (isWalletConnectError(message)) return
          if (originalNextJsError) originalNextJsError.apply(window.console, args)
        }
      }

      const handleError = (event) => {
        const message = event.error?.message || event.message || String(event.error || event)
        if (isWalletConnectError(message)) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          return false
        }
      }

      const handleUnhandledRejection = (event) => {
        const message = event.reason?.message || String(event.reason)
        if (isWalletConnectError(message)) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          return false
        }
      }

      // Add multiple event listeners to catch all error types
      window.addEventListener('error', handleError, true) // capture phase
      window.addEventListener('unhandledrejection', handleUnhandledRejection, true)
      document.addEventListener('error', handleError, true)

      // Cleanup function
      const cleanup = () => {
        console.error = originalConsoleError
        console.warn = originalConsoleWarn
        console.log = originalConsoleLog
        window.onerror = originalOnError
        window.removeEventListener('error', handleError, true)
        window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
        document.removeEventListener('error', handleError, true)
      }

      cleanupFn = cleanup
    }

    return cleanupFn
  }, [])

  const applyTheme = useCallback((next) => {
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, applyTheme])

  return (
    <ToastProvider>
      <GobyProvider>
        <WalletConnectProvider>
          <JsonRpcProvider>
            <ThemeContext.Provider value={{ theme, toggleTheme }}>
              <Component {...pageProps} />
            </ThemeContext.Provider>
          </JsonRpcProvider>
        </WalletConnectProvider>
      </GobyProvider>
    </ToastProvider>
  )
}

export default MyApp
