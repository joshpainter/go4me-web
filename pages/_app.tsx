import 'semantic-ui-css/semantic.min.css'
import '../styles/globals.css'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { AppProps } from 'next/app'
import { WalletConnectProvider } from '../lib/wallet/WalletConnectContext'
import { JsonRpcProvider } from '../lib/wallet/JsonRpcContext'
import { GobyProvider } from '../lib/wallet/GobyContext'
import { ToastProvider } from '../components/ui/Toast'

type ThemeValue = { theme: 'light' | 'dark'; toggleTheme: () => void }
const ThemeContext = createContext<ThemeValue>({ theme: 'light', toggleTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

function MyApp({ Component, pageProps }: AppProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Initialize theme on mount (avoids SSR mismatch issues)
  useEffect(() => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null
      const preferred =
        (stored as 'light' | 'dark' | null) ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      setTheme(preferred)
      document.documentElement.setAttribute('data-theme', preferred)
    } catch {}

    // Comprehensive WalletConnect error suppression
    const isWalletConnectMessage = (val: unknown): boolean => {
      if (!val) return false
      if (typeof val === 'string') {
        return (
          val.includes('No matching key') ||
          val.includes('pairing: undefined') ||
          val.includes('cleanupDuplicatePairings') ||
          val.includes('onSessionSettleRequest') ||
          val.includes('getData') ||
          val.includes('getRecord') ||
          val.includes('onRelayEventResponse') ||
          val.includes('core/pairing') ||
          val.includes('@walletconnect/core') ||
          val.includes('@walletconnect/sign-client')
        )
      }
      if (val && typeof val === 'object') {
        const obj = val as Record<string, unknown>
        if (typeof obj.message === 'string' && obj.message) return isWalletConnectMessage(obj.message)
        if (typeof obj.context === 'string' && obj.context.startsWith('core')) return true
      }
      return false
    }

    const isWalletConnectError = (...args: unknown[]) => args.some(isWalletConnectMessage)

    // Override window.onerror to catch all errors
    const originalOnError = window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMessage = String((message as string) || (error as any)?.message || (error as any) || '')
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

    console.error = (...args: unknown[]) => {
      const message = args.join(' ' as any)
      if (isWalletConnectError(message)) return
      originalConsoleError.apply(console, args as any)
    }

    console.warn = (...args: unknown[]) => {
      const message = args.join(' ' as any)
      if (isWalletConnectError(message)) return
      originalConsoleWarn.apply(console, args as any)
    }

    console.log = (...args: unknown[]) => {
      const message = args.join(' ' as any)
      if (isWalletConnectError(message)) return
      originalConsoleLog.apply(console, args as any)
    }

    // Suppress Next.js dev overlay errors for WalletConnect
    if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.buildId) {
      const originalNextJsError = window.console.error
      window.console.error = (...args: unknown[]) => {
        const message = args.join(' ' as any)
        if (isWalletConnectError(message)) return
        if (originalNextJsError) (originalNextJsError as any).apply(window.console, args as any)
      }
    }

    const handleError = (event: ErrorEvent) => {
      const message = (event.error as any)?.message || event.message || String((event as any).error || event)
      if (isWalletConnectError(message)) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        return false
      }
      return undefined
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = (event as any).reason
      const message = reason?.message || String(reason)
      if (isWalletConnectError(message)) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        return false
      }
      return undefined
    }

    // Add multiple event listeners to catch all error types
    window.addEventListener('error', handleError, true) // capture phase
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)
    document.addEventListener('error', handleError as any, true)

    // Cleanup function
    const cleanup = () => {
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      console.log = originalConsoleLog
      window.onerror = originalOnError as any
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
      document.removeEventListener('error', handleError as any, true)
    }

    return cleanup
  }, [])

  const applyTheme = useCallback((next: 'light' | 'dark') => {
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {}
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
