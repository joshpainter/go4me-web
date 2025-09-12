import Client from '@walletconnect/sign-client'
import { PairingTypes, SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { METADATA, REQUIRED_NAMESPACES } from '../wc/wallet-connect'
import { PROJECT_ID, RELAY_URL, CHAIN_ID } from '../wc/env'
import { CustomConnectModal } from '../../components/wallet/CustomConnectModal'
import { crossDomainStorage } from './CrossDomainStorage'

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

const WalletConnectContext = createContext<WalletConnectContextValue>({} as WalletConnectContextValue)

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

  const reset = useCallback(() => {
    setSession(undefined)
    setAccounts([])
    setError(null)
  }, [])

  const onSessionConnected = useCallback((sess: SessionTypes.Struct) => {
    const allNamespaceAccounts = Object.values(sess.namespaces)
      .map((ns) => ns.accounts)
      .flat()
    setSession(sess)
    setAccounts(allNamespaceAccounts)
  }, [])

  // Aggressive purge of ALL pairings to prevent "No matching key" errors when reconnecting
  const purgeAllPairings = useCallback((c: Client) => {
    try {
      const core: unknown = (c as unknown as { core?: unknown }).core
      const pairingApi: unknown = core && (core as { pairing?: unknown }).pairing
      const getAll = pairingApi && (pairingApi as { getAll?: (opts?: unknown) => unknown[] }).getAll
      const all = typeof getAll === 'function' ? (getAll.call(pairingApi) as unknown[]) : []
      all.forEach((p) => {
        try {
          const topic = (p as { topic?: string }).topic
          const del = pairingApi && (pairingApi as { delete?: (t: string) => void }).delete
          if (topic && typeof del === 'function') del.call(pairingApi, topic)
        } catch {}
      })
    } catch {}
  }, [])

  // Aggressively clear stale core storage entries that can cause "No matching key"
  const hardResetCore = useCallback(async (c: Client) => {
    try {
      const core: unknown = (c as unknown as { core?: unknown }).core
      const storage: unknown = core && (core as { storage?: unknown }).storage
      if (!storage || typeof (storage as { getKeys?: () => Promise<string[]> }).getKeys !== 'function') return
      const keys: string[] = await (storage as { getKeys: () => Promise<string[]> }).getKeys()
      const toRemove = keys.filter(
        (k) =>
          k.includes('core:pairing') ||
          k.includes('core:history') ||
          k.includes('core:expirer') ||
          k.includes('core:messages'),
      )
      for (const k of toRemove) {
        try {
          await (storage as { removeItem: (k: string) => Promise<void> }).removeItem(k)
        } catch {}
      }
    } catch {}
  }, [])

  const connect = useCallback(async () => {
    if (!client) throw new Error('WalletConnect is not initialized')
    if (isConnecting) return

    try {
      setIsConnecting(true)
      setShowModal(true)
      setError(null)

      // Force a fresh pairing every time to avoid undefined pairing keys
      const { uri, approval } = await client.connect({
        pairingTopic: undefined,
        requiredNamespaces: REQUIRED_NAMESPACES,
      })
      if (uri) {
        setQrCodeUri(uri)
        try {
          const sess = await approval()
          onSessionConnected(sess)
          setPairings(client.pairing.getAll({ active: true }))
          setShowModal(false)
        } catch (approveErr: unknown) {
          const msg = (approveErr as { message?: string } | null)?.message || 'Connection request was rejected'
          setError(msg)
          throw approveErr
        } finally {
          setIsConnecting(false)
        }
      }
    } catch (e: unknown) {
      console.error(e)
      setIsConnecting(false)
      const hasMessage = typeof (e as { message?: string } | null)?.message === 'string'
      if (!hasMessage) setError('WalletConnect error')
    }
  }, [client, onSessionConnected, isConnecting])

  const disconnect = useCallback(async () => {
    try {
      if (client && session) {
        await client.disconnect({ topic: session.topic, reason: getSdkError('USER_DISCONNECTED') })
      }
      // Purge all pairings after disconnect to avoid stale state
      if (client) {
        try {
          purgeAllPairings(client)
        } catch {}
      }
    } catch (e: any) {
      console.warn('Disconnect error (ignored):', e?.message || e)
    } finally {
      reset()
    }
  }, [client, session, purgeAllPairings, reset])

  const subscribeToEvents = useCallback(
    async (c: Client) => {
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
        try {
          reset()
        } catch {}
      })
      c.on('session_event', () => {
        // Quiet noisy logs from underlying client; handle per-request errors in callers
      })

      // Add global error handlers to suppress WalletConnect internal errors
      if (typeof window !== 'undefined') {
        const originalConsoleError = console.error
        console.error = (...args: unknown[]) => {
          const message = args.map(String).join(' ')
          // Suppress specific WalletConnect errors that are noise
          if (
            message.includes('No matching key') ||
            message.includes('pairing: undefined') ||
            message.includes('getRecord') ||
            message.includes('cleanupDuplicatePairings') ||
            message.includes('onSessionSettleRequest') ||
            message.includes('onRelayEventResponse')
          ) {
            return // silently ignore
          }
          originalConsoleError.apply(console, args as [])
        }

        // Handle unhandled promise rejections from WalletConnect
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
          const message = event.reason?.message || String(event.reason)
          if (
            message.includes('No matching key') ||
            message.includes('pairing: undefined') ||
            message.includes('getRecord') ||
            message.includes('cleanupDuplicatePairings') ||
            message.includes('onSessionSettleRequest') ||
            message.includes('onRelayEventResponse')
          ) {
            event.preventDefault() // prevent the error from showing
            return
          }
        }
        window.addEventListener('unhandledrejection', handleUnhandledRejection)

        // Store cleanup function
        ;(c as unknown as { _cleanup?: () => void })._cleanup = () => {
          console.error = originalConsoleError
          window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        }
      }
    },
    [onSessionConnected, reset],
  )

  const checkPersistedState = useCallback(
    async (c: Client) => {
      setPairings(c.pairing.getAll({ active: true }))
      if (session) return
      if (c.session.length) {
        const lastKeyIndex = c.session.keys.length - 1
        const sess = c.session.get(c.session.keys[lastKeyIndex])
        onSessionConnected(sess)
        return sess
      }
    },
    [session, onSessionConnected],
  )

  const createClient = useCallback(async () => {
    setIsInitializing(true)
    try {
      // Clean legacy storage/cookies once on boot
      try {
        ;(crossDomainStorage as unknown as { cleanupLegacy?: () => void }).cleanupLegacy?.()
      } catch {}

      const safeMeta = { ...METADATA, url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost' }
      const c = await Client.init({
        relayUrl: RELAY_URL,
        projectId: PROJECT_ID,
        metadata: safeMeta,
        storage: crossDomainStorage,
      })

      // Patch the engine's cleanupDuplicatePairings to a no-op to avoid benign WC issue
      const engine: unknown = (c as unknown as { engine?: unknown }).engine || c
      if (
        engine &&
        typeof (engine as { cleanupDuplicatePairings?: () => Promise<void> }).cleanupDuplicatePairings === 'function'
      ) {
        ;(engine as { cleanupDuplicatePairings: () => Promise<void> }).cleanupDuplicatePairings = async () => {
          /* no-op */
        }
      }
      // Also guard onSessionSettleRequest to ignore this specific benign error
      if (
        engine &&
        typeof (engine as { onSessionSettleRequest?: (...a: unknown[]) => Promise<unknown> }).onSessionSettleRequest ===
          'function'
      ) {
        const origSettle = (
          engine as { onSessionSettleRequest: (...a: unknown[]) => Promise<unknown> }
        ).onSessionSettleRequest.bind(engine)
        ;(engine as { onSessionSettleRequest: (...a: unknown[]) => Promise<unknown> }).onSessionSettleRequest = async (
          ...args: unknown[]
        ) => {
          try {
            return await origSettle(...args)
          } catch (error: unknown) {
            const msg = String((error as { message?: string } | null)?.message || error || '')
            if (msg.includes('No matching key') && msg.includes('pairing')) {
              // Ignore and continue; state will be reconciled by subsequent events
              return
            }
            throw error
          }
        }
      }

      setClient(c)
      await subscribeToEvents(c)
      await checkPersistedState(c)
    } finally {
      setIsInitializing(false)
    }
  }, [subscribeToEvents, checkPersistedState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client && (client as unknown as { _cleanup?: () => void })._cleanup) {
        ;(client as unknown as { _cleanup?: () => void })._cleanup?.()
      }
    }
  }, [client])

  useEffect(() => {
    if (!client) createClient()
  }, [client, createClient])

  // Sync session state across tabs/subdomains
  useEffect(() => {
    if (typeof window === 'undefined' || !client) return

    const handleStorageChange = async () => {
      try {
        const sessions = client.session.getAll()
        if (sessions.length > 0 && !session) {
          // Session exists but not in current context - sync it
          const latestSession = sessions[sessions.length - 1]
          onSessionConnected(latestSession)
        } else if (sessions.length === 0 && session) {
          // Session was disconnected in another tab - sync disconnect
          reset()
        }
      } catch {
        // Ignore sync errors
      }
    }

    // Listen for storage changes (works across tabs in same domain)
    window.addEventListener('storage', handleStorageChange)

    // For cross-subdomain sync, poll periodically (fallback)
    const syncInterval = setInterval(handleStorageChange, 5000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(syncInterval)
    }
  }, [client, session, onSessionConnected, reset])

  const value = useMemo(
    () => ({
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
    }),
    [client, session, connect, disconnect, reset, isInitializing, pairings, accounts, error],
  )

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
