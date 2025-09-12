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

// Utility helpers to avoid implicit any and stringify error-like values safely
const toStr = (v: unknown): string => {
  try {
    if (typeof v === 'string') return v
    if (v instanceof Error) return v.message
    if (v && typeof v === 'object') return JSON.stringify(v)
    return String(v)
  } catch {
    return String(v)
  }
}

const joinMsg = (...args: unknown[]) => args.map(toStr).join(' ')

const extractOnErrorMessage = (message: Event | string | unknown, error?: unknown): string => {
  if (typeof message === 'string') return message
  if (message instanceof ErrorEvent) return message.message
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return toStr(error)
}

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
      const errorMessage = extractOnErrorMessage(message, error)
      if (isWalletConnectError(errorMessage) || isWalletConnectError(source || '')) {
        return true // Prevent default error handling
      }
      if (originalOnError) return originalOnError(message, source, lineno, colno, error)
      return false
    }

    // Override console methods to suppress WalletConnect noise
    const originalConsoleError: (...args: unknown[]) => void = console.error.bind(console)
    const originalConsoleWarn: (...args: unknown[]) => void = console.warn.bind(console)
    const originalConsoleLog: (...args: unknown[]) => void = console.log.bind(console)

    console.error = (...args: unknown[]) => {
      const message = joinMsg(...args)
      if (isWalletConnectError(message)) return
      originalConsoleError(...args)
    }

    console.warn = (...args: unknown[]) => {
      const message = joinMsg(...args)
      if (isWalletConnectError(message)) return
      originalConsoleWarn(...args)
    }

    console.log = (...args: unknown[]) => {
      const message = joinMsg(...args)
      if (isWalletConnectError(message)) return
      originalConsoleLog(...args)
    }

    // Suppress Next.js dev overlay errors for WalletConnect
    // Narrowly probe Next.js global without extending the Window type
    const nextData: unknown =
      typeof window !== 'undefined' ? (window as unknown as { __NEXT_DATA__?: unknown }).__NEXT_DATA__ : undefined
    if (nextData && typeof nextData === 'object') {
      const originalNextJsError = window.console.error.bind(window.console) as (...args: unknown[]) => void
      window.console.error = (...args: unknown[]) => {
        const message = joinMsg(...args)
        if (isWalletConnectError(message)) return
        originalNextJsError(...args)
      }
    }

    const handleError = (event: ErrorEvent | Event) => {
      if (!(event instanceof ErrorEvent)) return undefined
      const message = event.error instanceof Error ? event.error.message : event.message || toStr(event.error)
      if (isWalletConnectError(message)) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        return false
      }
      return undefined
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as unknown
      const message = reason instanceof Error ? reason.message : toStr(reason)
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
