import React, { createContext, PropsWithChildren, useContext } from 'react'
import { useWalletConnect } from './WalletConnectContext'
import { ChiaMethod } from '../wc/wallet-connect'

interface ChiaTakeOfferRequest {
  offer: string
  fee?: number | string
}

interface JsonRpcShape {
  chiaTakeOffer: (data: ChiaTakeOfferRequest) => Promise<{ id: string }>
}

export const JsonRpcContext = createContext<JsonRpcShape>({} as JsonRpcShape)

export function JsonRpcProvider({ children }: PropsWithChildren) {
  const { client, session, chainId } = useWalletConnect()

  async function request<T>(method: ChiaMethod, params: unknown): Promise<T> {
    if (!client) throw new Error('WalletConnect is not initialized')
    if (!session) throw new Error('Session is not connected')

    try {
      const result = await client.request<T | { error: unknown }>({
        topic: session.topic,
        chainId,
        request: { method, params },
      })
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(JSON.stringify((result as any).error))
      }
      return result as T
    } catch (e: any) {
      // Normalise common WalletConnect rejections / disconnects
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('user rejected') || msg.includes('rejected') || msg.includes('denied')) throw new Error('Request rejected in wallet')
      if (msg.includes('no matching key') || msg.includes('pairing') || msg.includes('history:')) throw new Error('Wallet session not found. Please reconnect.')
      throw e
    }
  }

  async function chiaTakeOffer(data: ChiaTakeOfferRequest) {
    return await request<{ id: string }>(ChiaMethod.TakeOffer, data)
  }

  return (
    <JsonRpcContext.Provider value={{ chiaTakeOffer }}>
      {children}
    </JsonRpcContext.Provider>
  )
}

export function useJsonRpc() {
  const ctx = useContext(JsonRpcContext)
  if (!ctx) throw new Error('useJsonRpc must be used within JsonRpcProvider')
  return ctx
}

