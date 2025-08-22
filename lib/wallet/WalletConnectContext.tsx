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

  const reset = useCallback(() => {
    setSession(undefined);
    setAccounts([]);
    setError(null);
    // Also clear any stale UI state
    setShowModal(false);
    setIsConnecting(false);
    setQrCodeUri('');
  }, [])

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

  // Aggressively clear stale core storage entries that can cause "No matching key"
  const hardResetCore = useCallback(async (c: Client) => {
    try {
      const storage = (c as any).core?.storage
      if (!storage || !storage.getKeys) return
      const keys: string[] = await storage.getKeys()
      const toRemove = keys.filter(k => (
        k.includes('core:pairing') ||
        k.includes('core:history') ||
        k.includes('core:expirer') ||
        k.includes('core:messages') ||
        k.includes('core:session')
      ))
      for (const k of toRemove) {
        try { await storage.removeItem(k) } catch {}
      }
    } catch {}
  }, [])

  // Clear all sessions from client storage
  const clearAllSessions = useCallback(async (c: Client) => {
    try {
      // Clear all sessions from the client
      const sessions = c.session.getAll()
      for (const session of sessions) {
        try {
          c.session.delete(session.topic, getSdkError('USER_DISCONNECTED'))
        } catch {}
      }

      // Also clear session-related storage directly
      const storage = (c as any).core?.storage
      if (storage && storage.getKeys) {
        const keys: string[] = await storage.getKeys()
        const sessionKeys = keys.filter(k => k.includes('session'))
        for (const k of sessionKeys) {
          try { await storage.removeItem(k) } catch {}
        }
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
  }, [client, onSessionConnected, isConnecting])

  const disconnect = useCallback(async () => {
    try {
      if (client && session) {
        await client.disconnect({ topic: session.topic, reason: getSdkError('USER_DISCONNECTED') })
      }
      // Clear all sessions and pairings after disconnect to avoid stale state
      if (client) {
        try { await clearAllSessions(client) } catch {}
        try { purgeAllPairings(client) } catch {}
      }
    } catch (e: any) {
      console.warn('Disconnect error (ignored):', e?.message || e)
    } finally {
      reset()
    }
  }, [client, session, clearAllSessions, purgeAllPairings, reset])

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

    // Global error suppression is centralised in pages/_app.js for production only.
    // No additional console/error overrides are set here to keep behaviour consistent across the app.
  }, [onSessionConnected, reset])

  const checkPersistedState = useCallback(async (c: Client) => {
    setPairings(c.pairing.getAll({ active: true }))
    if (session) return
    if (c.session.length) {
      const lastKeyIndex = c.session.keys.length - 1
      const sess = c.session.get(c.session.keys[lastKeyIndex])

      // Validate session before restoring it
      try {
        // Check if session is expired
        if (sess.expiry && sess.expiry * 1000 < Date.now()) {
          try { c.session.delete(sess.topic, getSdkError('USER_DISCONNECTED')) } catch {}
          return
        }

        // Session appears valid, restore it
        onSessionConnected(sess)
        return sess
      } catch (e: any) {
        try { c.session.delete(sess.topic, getSdkError('USER_DISCONNECTED')) } catch {}
      }
    }
  }, [session, onSessionConnected])

  const createClient = useCallback(async () => {
    setIsInitializing(true)
    try {
      // Clean legacy storage/cookies once on boot
      try { (crossDomainStorage as any).cleanupLegacy?.() } catch {}

      const safeMeta = { ...METADATA, url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost' }
      const c = await Client.init({
        relayUrl: RELAY_URL,
        projectId: PROJECT_ID,
        metadata: safeMeta,
        storage: crossDomainStorage
      })

      // Patch the engine's cleanupDuplicatePairings to a no-op to avoid benign WC issue
      const engine: any = (c as any).engine || c
      if (engine && typeof engine.cleanupDuplicatePairings === 'function') {
        engine.cleanupDuplicatePairings = async () => { /* no-op: prevents spurious 'No matching key' */ }
      }
      // Also guard onSessionSettleRequest to ignore this specific benign error
      if (engine && typeof engine.onSessionSettleRequest === 'function') {
        const origSettle = engine.onSessionSettleRequest.bind(engine)
        engine.onSessionSettleRequest = async (...args: any[]) => {
          try {
            return await origSettle(...args)
          } catch (error: any) {
            const msg = String(error?.message || error || '')
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

  // Sync session state across tabs/subdomains
  useEffect(() => {
    if (typeof window === 'undefined' || !client) return

    const handleStorageChange = async () => {
      try {
        const sessions = client.session.getAll()
        if (sessions.length > 0 && !session) {
          // Session exists but not in current context - validate and sync it
          const latestSession = sessions[sessions.length - 1]

          // Validate session before syncing
          try {
            if (latestSession.expiry && latestSession.expiry * 1000 < Date.now()) {
              try { client.session.delete(latestSession.topic, getSdkError('USER_DISCONNECTED')) } catch {}
              return
            }
            onSessionConnected(latestSession)
          } catch (e: any) {
            try { client.session.delete(latestSession.topic, getSdkError('USER_DISCONNECTED')) } catch {}
          }
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

