import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Minimal Goby wallet typings per official docs: window.chia
// https://docs.goby.app/methods
declare global {
  interface Window { chia?: any }
}

interface GobyContextValue {
  isAvailable: boolean
  isConnected: boolean
  accounts: string[]
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  request: <T = any>(method: string, params?: any) => Promise<T>
}

const GobyContext = createContext<GobyContextValue>({} as any)

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
    const provider: any = window.chia

    const normaliseAccounts = (input: any): string[] => {
      if (!input) return []
      const src = Array.isArray(input) ? input : (input.accounts || input.addresses || input.wallets || [])
      const out: string[] = []
      for (const a of src) {
        if (typeof a === 'string') out.push(a)
        else if (a && typeof a === 'object') out.push(a.address || a.account || a.addr || '')
      }
      return out.filter(Boolean)
    }

    // 1) Direct connect()
    try {
      if (typeof provider.connect === 'function') {
        const res = await provider.connect()
        let accs = normaliseAccounts(res)
        if (!accs.length && typeof provider.request === 'function') {
          try { accs = normaliseAccounts(await provider.request({ method: 'chia_getWalletAddresses' })) } catch {}
        }
        if (accs.length) { setAccounts(accs); setConnected(true); return }
      }
    } catch {}

    // 2) request({ method: 'requestAccounts' })
    try {
      if (typeof provider.request === 'function') {
        const res = await provider.request({ method: 'requestAccounts' })
        let accs = normaliseAccounts(res)
        if (!accs.length) {
          try { accs = normaliseAccounts(await provider.request({ method: 'chia_getWalletAddresses' })) } catch {}
        }
        if (accs.length) { setAccounts(accs); setConnected(true); return }
      }
    } catch {}

    // 3) request({ method: 'chia_logIn' })
    try {
      if (typeof provider.request === 'function') {
        const res = await provider.request({ method: 'chia_logIn', params: {} })
        let accs = normaliseAccounts(res)
        if (!accs.length) {
          try { accs = normaliseAccounts(await provider.request({ method: 'chia_getWalletAddresses' })) } catch {}
        }
        if (accs.length) { setAccounts(accs); setConnected(true); return }
      }
    } catch {}

    // 4) As a last attempt, try get addresses only
    try {
      if (typeof provider.request === 'function') {
        const accs = normaliseAccounts(await provider.request({ method: 'chia_getWalletAddresses' }))
        if (accs.length) { setAccounts(accs); setConnected(true); return }
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

  const request = useCallback(async <T,>(method: string, params?: any): Promise<T> => {
    if (!available || !window.chia) throw new Error('Goby is not available')
    const provider: any = window.chia

    const isTakeOffer = (m: string) => /takeoffer|acceptoffer|chia_takeoffer/i.test(m)
    const extractOffer = (p: any): string | null => {
      if (!p) return null
      if (typeof p === 'string' && p.startsWith('offer')) return p
      if (typeof p?.offer === 'string' && p.offer.startsWith('offer')) return p.offer
      if (Array.isArray(p) && typeof p[0] === 'string' && p[0].startsWith('offer')) return p[0]
      return null
    }

    if (isTakeOffer(method)) {
      const offer = extractOffer(params)
      if (!offer) throw new Error('Goby: missing offer string for takeOffer')

      // Official mapping per docs: window.chia.request({ method: 'takeOffer', params: { offer } })
      if (typeof provider.request === 'function') {
        const res = await provider.request({ method: 'takeOffer', params: { offer } })
        const id = res?.id || res?.txId || res?.txid || res?.hash || (typeof res === 'string' ? res : 'goby')
        return { id } as unknown as T
      }
      if (typeof provider.takeOffer === 'function') {
        const res = await provider.takeOffer({ offer })
        const id = res?.id || res?.txId || res?.txid || res?.hash || (typeof res === 'string' ? res : 'goby')
        return { id } as unknown as T
      }
      throw new Error('Goby takeOffer not supported by this version')
    }

    // Default path
    if (typeof provider.request === 'function') {
      return await provider.request({ method, params })
    }
    if (typeof provider[method] === 'function') {
      return await provider[method](params)
    }
    throw new Error('Goby does not support request API')
  }, [available])

  const value = useMemo(() => ({
    isAvailable: available,
    isConnected: connected,
    accounts,
    connect,
    disconnect,
    request,
  }), [available, connected, accounts, connect, disconnect, request])

  return (
    <GobyContext.Provider value={value}>
      {children}
    </GobyContext.Provider>
  )
}

export function useGoby() {
  const ctx = useContext(GobyContext)
  if (!ctx) throw new Error('useGoby must be used within GobyProvider')
  return ctx
}

