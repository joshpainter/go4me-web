import 'semantic-ui-css/semantic.min.css'
import '../styles/globals.css'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { WalletConnectProvider } from '../lib/wallet/WalletConnectContext'
import { JsonRpcProvider } from '../lib/wallet/JsonRpcContext'
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

    // Comprehensive WalletConnect error suppression
    const isWalletConnectError = (message) => {
      return message && (
        message.includes('No matching key') ||
        message.includes('pairing: undefined') ||
        message.includes('cleanupDuplicatePairings') ||
        message.includes('onSessionSettleRequest') ||
        message.includes('getData') ||
        message.includes('getRecord') ||
        message.includes('onRelayEventResponse') ||
        message.includes('core/pairing') ||
        message.includes('history:') ||
        message.includes('webpack-internal') ||
        message.includes('@walletconnect/core') ||
        message.includes('@walletconnect/sign-client')
      )
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
      const message = args.join(' ')
      if (isWalletConnectError(message)) return
      originalConsoleError.apply(console, args)
    }

    console.warn = (...args) => {
      const message = args.join(' ')
      if (isWalletConnectError(message)) return
      originalConsoleWarn.apply(console, args)
    }

    console.log = (...args) => {
      const message = args.join(' ')
      if (isWalletConnectError(message)) return
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

    return cleanup
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
      <WalletConnectProvider>
        <JsonRpcProvider>
          <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <Component {...pageProps} />
          </ThemeContext.Provider>
        </JsonRpcProvider>
      </WalletConnectProvider>
    </ToastProvider>
  )
}

export default MyApp
