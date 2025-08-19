import Client from '@walletconnect/sign-client'
import { PairingTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { METADATA, REQUIRED_NAMESPACES } from '../wc/wallet-connect'
import { PROJECT_ID, RELAY_URL, CHAIN_ID } from '../wc/env'
import { CustomConnectModal } from '../../components/wallet/CustomConnectModal'

interface WalletConnectContextValue {
  client?: Client
  session?: SessionTypes.Struct
  chainId: string
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  reset: () => void
  isInitializing: boolean
  pairings: PairingTypes.Struct[]
  accounts: string[]
  error: string | null
}

const WalletConnectContext = createContext<WalletConnectContextValue>({} as any)

export function WalletConnectProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<Client>()
  const [pairings, setPairings] = useState<PairingTypes.Struct[]>([])
  const [session, setSession] = useState<SessionTypes.Struct>()
  const [isInitializing, setIsInitializing] = useState(false)
  const [accounts, setAccounts] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Custom modal state
  const [showModal, setShowModal] = useState(false)
  const [qrCodeUri, setQrCodeUri] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)

  const reset = useCallback(() => { setSession(undefined); setAccounts([]); setError(null) }, [])

  const onSessionConnected = useCallback((sess: SessionTypes.Struct) => {
    const allNamespaceAccounts = Object.values(sess.namespaces).map((ns) => ns.accounts).flat()
    setSession(sess)
    setAccounts(allNamespaceAccounts)
  }, [])

  // Aggressive purge of ALL pairings to prevent "No matching key" errors when reconnecting
  const purgeAllPairings = useCallback((c: Client) => {
    try {
      const all = (c as any)?.pairing?.getAll?.() || []
      all.forEach((p: any) => {
        try { (c as any).core?.pairing?.delete?.(p.topic) } catch {}
      })
    } catch {}
  }, [])

  const connect = useCallback(async () => {
    if (!client) throw new Error('WalletConnect is not initialized')

    try {
      setIsConnecting(true)
      setShowModal(true)
      setError(null)
      purgeAllPairings(client)

      // Force a fresh pairing every time to avoid undefined pairing keys
      const { uri, approval } = await client.connect({ pairingTopic: undefined, requiredNamespaces: REQUIRED_NAMESPACES })
      if (uri) {
        setQrCodeUri(uri)
        try {
          const sess = await approval()
          onSessionConnected(sess)
          setPairings(client.pairing.getAll({ active: true }))
          setShowModal(false)
        } catch (approveErr: any) {
          setError(approveErr?.message || 'Connection request was rejected')
          throw approveErr
        } finally {
          setIsConnecting(false)
        }
      }
    } catch (e: any) {
      console.error(e)
      setIsConnecting(false)
      if (!('message' in e)) setError('WalletConnect error')
    }
  }, [client, onSessionConnected, purgeAllPairings])

  const disconnect = useCallback(async () => {
    try {
      if (client && session) {
        await client.disconnect({ topic: session.topic, reason: getSdkError('USER_DISCONNECTED') })
      }
      // Purge all pairings after disconnect to avoid stale state
      if (client) {
        try { purgeAllPairings(client) } catch {}
      }
    } catch (e: any) {
      console.warn('Disconnect error (ignored):', e?.message || e)
    } finally {
      reset()
    }
  }, [client, session, purgeAllPairings, reset])

  const subscribeToEvents = useCallback(async (c: Client) => {
    c.on('session_update', ({ topic, params }) => {
      try {
        const { namespaces } = params
        const sess = c.session.get(topic)
        const updated = { ...sess, namespaces }
        onSessionConnected(updated)
      } catch (e: any) {
        // Gracefully ignore late events after disconnect
        console.warn('Ignored session_update:', e?.message || e)
      }
    })
    c.on('session_delete', () => {
      try { reset() } catch {}
    })
    c.on('session_event', () => {
      // Quiet noisy logs from underlying client; handle per-request errors in callers
    })

    // Add global error handlers to suppress WalletConnect internal errors
    if (typeof window !== 'undefined') {
      const originalConsoleError = console.error
      console.error = (...args: any[]) => {
        const message = args.join(' ')
        // Suppress specific WalletConnect errors that are noise
        if (message.includes('No matching key') ||
            message.includes('pairing: undefined') ||
            message.includes('getRecord') ||
            message.includes('cleanupDuplicatePairings') ||
            message.includes('onSessionSettleRequest') ||
            message.includes('onRelayEventResponse')) {
          return // silently ignore
        }
        originalConsoleError.apply(console, args)
      }

      // Handle unhandled promise rejections from WalletConnect
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const message = event.reason?.message || String(event.reason)
        if (message.includes('No matching key') ||
            message.includes('pairing: undefined') ||
            message.includes('getRecord') ||
            message.includes('cleanupDuplicatePairings') ||
            message.includes('onSessionSettleRequest') ||
            message.includes('onRelayEventResponse')) {
          event.preventDefault() // prevent the error from showing
          return
        }
      }
      window.addEventListener('unhandledrejection', handleUnhandledRejection)

      // Store cleanup function
      ;(c as any)._cleanup = () => {
        console.error = originalConsoleError
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      }
    }
  }, [onSessionConnected, reset])

  const checkPersistedState = useCallback(async (c: Client) => {
    setPairings(c.pairing.getAll({ active: true }))
    if (session) return
    if (c.session.length) {
      const lastKeyIndex = c.session.keys.length - 1
      const sess = c.session.get(c.session.keys[lastKeyIndex])
      onSessionConnected(sess)
      return sess
    }
  }, [session, onSessionConnected])

  const createClient = useCallback(async () => {
    setIsInitializing(true)
    try {
      const safeMeta = { ...METADATA, url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost' }
      const c = await Client.init({ relayUrl: RELAY_URL, projectId: PROJECT_ID, metadata: safeMeta })

      // Patch the client to suppress cleanupDuplicatePairings errors
      if ((c as any).cleanupDuplicatePairings) {
        const originalCleanup = (c as any).cleanupDuplicatePairings.bind(c)
        ;(c as any).cleanupDuplicatePairings = async (...args: any[]) => {
          try {
            return await originalCleanup(...args)
          } catch (error: any) {
            // Silently ignore "No matching key" errors from cleanup
            if (error?.message?.includes('No matching key') || error?.message?.includes('pairing: undefined')) {
              return
            }
            throw error
          }
        }
      }

      setClient(c)
      await subscribeToEvents(c)
      await checkPersistedState(c)
    } finally { setIsInitializing(false) }
  }, [subscribeToEvents, checkPersistedState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client && (client as any)._cleanup) {
        (client as any)._cleanup()
      }
    }
  }, [client])

  useEffect(() => { if (!client) createClient() }, [client, createClient])

  const value = useMemo(() => ({
    chainId: CHAIN_ID,
    client,
    session,
    connect,
    disconnect,
    reset,
    isInitializing,
    pairings,
    accounts,
    error,
  }), [client, session, connect, disconnect, reset, isInitializing, pairings, accounts, error])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setIsConnecting(false)
    setQrCodeUri('')
    setError(null)
  }, [])

  return (
    <WalletConnectContext.Provider value={value}>
      {children}
      <CustomConnectModal
        isOpen={showModal}
        onClose={handleCloseModal}
        qrCodeUri={qrCodeUri}
        isConnecting={isConnecting}
        error={error}
      />
    </WalletConnectContext.Provider>
  )
}

export function useWalletConnect() {
  const ctx = useContext(WalletConnectContext)
  if (!ctx) throw new Error('useWalletConnect must be used within WalletConnectProvider')
  return ctx
}

