import { createContext, PropsWithChildren, useContext } from 'react'
import { useWalletConnect } from './WalletConnectContext'
import { useGoby } from './GobyContext'
import { useMobileDetection } from '../hooks/useDebounceResize'
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
  const { isConnected: gobyConnected, request: gobyRequest } = useGoby()

  // Mobile detection - disable Goby functionality on mobile
  const isMobile = useMobileDetection(768)

  async function request<T>(method: ChiaMethod, params: unknown): Promise<T> {
    // Simple logic: if WalletConnect connected, use it. Otherwise use Goby if connected.
    if (session) {
      if (!client) throw new Error('WalletConnect is not initialized')

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
        const msg = (e?.message || '').toLowerCase()
        if (msg.includes('user rejected') || msg.includes('rejected') || msg.includes('denied')) throw new Error('Request rejected in wallet')
        if (msg.includes('no matching key') || msg.includes('pairing') || msg.includes('history:')) throw new Error('Wallet session not found. Please reconnect.')
        throw e
      }
    }

    // Use Goby if connected (desktop only)
    if (gobyConnected && !isMobile) {
      return await gobyRequest<T>(method, params)
    }

    // No wallet connected
    throw new Error('No wallet is connected')
  }

  async function chiaTakeOffer(data: ChiaTakeOfferRequest) {
    // Simple: just make the request, let the request function handle wallet selection
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

