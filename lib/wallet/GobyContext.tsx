import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Minimal Goby wallet typings per official docs: window.chia
// https://docs.goby.app/methods
type GobyRequestArgs = { method: string; params?: unknown }
type GobyProvider = {
  connect?: () => Promise<unknown>
  disconnect?: () => Promise<void>
  request?: (args: GobyRequestArgs) => Promise<unknown>
  takeOffer?: (args: { offer: string }) => Promise<unknown>
  [key: string]: unknown
}

declare global {
  interface Window {
    chia?: GobyProvider
  }
}

interface GobyContextValue {
  isAvailable: boolean
  isConnected: boolean
  accounts: string[]
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>
}

const GobyContext = createContext<GobyContextValue>({} as GobyContextValue)

export function GobyProvider({ children }: PropsWithChildren) {
  const [available, setAvailable] = useState(false)
  const [connected, setConnected] = useState(false)
  const [accounts, setAccounts] = useState<string[]>([])

  // Detect extension
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setAvailable(!!window.chia)
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [])

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.chia) throw new Error('Goby is not available')
    const provider = window.chia as GobyProvider

    const normaliseAccounts = (input: unknown): string[] => {
      if (!input) return []
      const src = Array.isArray(input)
        ? input
        : (typeof input === 'object' &&
            input !== null &&
            ((input as { accounts?: unknown[] }).accounts ||
              (input as { addresses?: unknown[] }).addresses ||
              (input as { wallets?: unknown[] }).wallets)) ||
          []
      const out: string[] = []
      for (const a of src as unknown[]) {
        if (typeof a === 'string') out.push(a)
        else if (a && typeof a === 'object') {
          const obj = a as Record<string, unknown>
          const val = obj.address || obj.account || obj.addr
          if (typeof val === 'string') out.push(val)
        }
      }
      return out.filter(Boolean)
    }

    // 1) Direct connect()
    try {
      if (typeof provider.connect === 'function') {
        const res = await provider.connect()
        let accs = normaliseAccounts(res)
        if (!accs.length && typeof provider.request === 'function') {
          try {
            accs = normaliseAccounts(await provider.request({ method: 'chia_getWalletAddresses' }))
          } catch {}
        }
        if (accs.length) {
          setAccounts(accs)
          setConnected(true)
          return
        }
      }
    } catch {}

    // 2) request({ method: 'requestAccounts' })
    try {
      if (typeof provider.request === 'function') {
        const res = await provider.request({ method: 'requestAccounts' })
        let accs = normaliseAccounts(res)
        if (!accs.length) {
          try {
            accs = normaliseAccounts(await provider.request({ method: 'chia_getWalletAddresses' }))
          } catch {}
        }
        if (accs.length) {
          setAccounts(accs)
          setConnected(true)
          return
        }
      }
    } catch {}

    // 3) request({ method: 'chia_logIn' })
    try {
      if (typeof provider.request === 'function') {
        const res = await provider.request({ method: 'chia_logIn', params: {} })
        let accs = normaliseAccounts(res)
        if (!accs.length) {
          try {
            accs = normaliseAccounts(await provider.request({ method: 'chia_getWalletAddresses' }))
          } catch {}
        }
        if (accs.length) {
          setAccounts(accs)
          setConnected(true)
          return
        }
      }
    } catch {}

    // 4) As a last attempt, try get addresses only
    try {
      if (typeof provider.request === 'function') {
        const accs = normaliseAccounts(await provider.request({ method: 'chia_getWalletAddresses' }))
        if (accs.length) {
          setAccounts(accs)
          setConnected(true)
          return
        }
      }
    } catch {}

    throw new Error('Unable to connect to Goby')
  }, [])

  const disconnect = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.chia && typeof window.chia.disconnect === 'function') {
        await window.chia.disconnect()
      }
    } catch {}
    setConnected(false)
    setAccounts([])
  }, [])

  const request = useCallback(
    async <T,>(method: string, params?: unknown): Promise<T> => {
      if (!available || !window.chia) throw new Error('Goby is not available')
      const provider: GobyProvider = window.chia

      const isTakeOffer = (m: string) => /takeoffer|acceptoffer|chia_takeoffer/i.test(m)
      const extractOffer = (p: unknown): string | null => {
        if (!p) return null
        if (typeof p === 'string' && p.startsWith('offer')) return p
        if (typeof p === 'object' && p !== null && typeof (p as { offer?: unknown }).offer === 'string') {
          const off = (p as { offer: string }).offer
          if (off.startsWith('offer')) return off
        }
        if (Array.isArray(p) && typeof p[0] === 'string' && p[0].startsWith('offer')) return p[0]
        return null
      }

      if (isTakeOffer(method)) {
        const offer = extractOffer(params)
        if (!offer) throw new Error('Goby: missing offer string for takeOffer')

        // Official mapping per docs: window.chia.request({ method: 'takeOffer', params: { offer } })
        if (typeof provider.request === 'function') {
          const res = await provider.request({ method: 'takeOffer', params: { offer } })
          const id = extractId(res)
          return { id } as unknown as T
        }
        if (typeof provider.takeOffer === 'function') {
          const res = await provider.takeOffer({ offer })
          const id = extractId(res)
          return { id } as unknown as T
        }
        throw new Error('Goby takeOffer not supported by this version')
      }

      // Default path
      if (typeof provider.request === 'function') {
        return (await provider.request({ method, params })) as Promise<T>
      }
      if (typeof (provider as Record<string, unknown>)[method] === 'function') {
        return (await (provider as Record<string, (p: unknown) => Promise<unknown>>)[method](params)) as Promise<T>
      }
      throw new Error('Goby does not support request API')
    },
    [available],
  )

  // Helper: normalise various possible return shapes to an id string
  function extractId(res: unknown): string {
    if (typeof res === 'string') return res
    if (res && typeof res === 'object') {
      const r = res as Record<string, unknown>
      const candidates = [
        r.id,
        (r as { txId?: unknown }).txId,
        (r as { txid?: unknown }).txid,
        (r as { hash?: unknown }).hash,
      ]
      for (const c of candidates) if (typeof c === 'string' && c) return c
    }
    return 'goby'
  }

  const value = useMemo(
    () => ({
      isAvailable: available,
      isConnected: connected,
      accounts,
      connect,
      disconnect,
      request,
    }),
    [available, connected, accounts, connect, disconnect, request],
  )

  return <GobyContext.Provider value={value}>{children}</GobyContext.Provider>
}

export function useGoby() {
  const ctx = useContext(GobyContext)
  if (!ctx) throw new Error('useGoby must be used within GobyProvider')
  return ctx
}
