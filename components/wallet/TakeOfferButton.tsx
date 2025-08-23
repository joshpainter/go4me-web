import React, { useState } from 'react'
import { useJsonRpc } from '../../lib/wallet/JsonRpcContext'
import { useWalletConnect } from '../../lib/wallet/WalletConnectContext'
import { useGoby } from '../../lib/wallet/GobyContext'
import { useToast } from '../ui/Toast'
import { useMobileDetection } from '../../lib/hooks/useDebounceResize'

type Props = {
  offerId: string
  children?: React.ReactNode
  className?: string
  title?: string
  ariaLabel?: string
  labelDefault?: string
  labelWhenSage?: string
}

export function TakeOfferButton({ offerId, children, className, title, ariaLabel, labelDefault = 'Dexie', labelWhenSage = 'Take Offer' }: Props) {
  const { chiaTakeOffer } = useJsonRpc()
  const { session, connect, reset } = useWalletConnect()
  const { isConnected: gobyConnected } = useGoby()
  const { showToast, showTransactionSuccess } = useToast() as any
  const [busy, setBusy] = useState(false)
  const [resultId, setResultId] = useState<string | null>(null)

  // Mobile detection - hide Goby functionality on mobile
  const isMobile = useMobileDetection(768)

  // Consider the user "connected" if either Goby (desktop only) or WalletConnect is connected
  const isConnectedAny = (gobyConnected && !isMobile) || !!session

  async function handleClick() {
    setBusy(true); setResultId(null)
    try {
      // Simple logic: if nothing connected, pop out connection modal
      if (!session && !(gobyConnected && !isMobile)) {
        await connect()
      }

      // Fetch offer file from Dexie API
      const res = await fetch(`https://api.dexie.space/v1/offers/${offerId}`)
      if (!res.ok) throw new Error('Failed to fetch offer from Dexie')
      const data = await res.json()
      // Dexie shapes observed:
      // - { offer: 'offer1…' }
      // - { success: true, offer: { offer: 'offer1…', ... } }
      // - { data: { offer: 'offer1…' } }
      const offer = (() => {
        if (typeof data === 'string' && data.startsWith('offer')) return data
        if (typeof data?.offer === 'string') return data.offer
        if (typeof data?.data?.offer === 'string') return data.data.offer
        if (typeof data?.offer?.offer === 'string') return data.offer.offer
        return null
      })()
      if (!offer) throw new Error('Offer not found in Dexie response')

      const r = await chiaTakeOffer({ offer })
      // r may be null/undefined if rejected in some wallets; guard access
      if (r && (r as any).id) {
        const txId = (r as any).id as string
        setResultId(txId)
        // Show transaction success popup with small-font hash
        showTransactionSuccess?.(txId, 'Offer accepted successfully!')
      }
    } catch (e: any) {
      const msg = (e?.message || String(e))
      // If user rejected or closed the request, quietly reset UI back to normal
      if (!/reject|denied|cancel|close/i.test(msg)) {
        // Show user-friendly error messages via toast
        let userMessage = msg
        if (msg.includes('Coin selection error: no spendable coins')) {
          userMessage = 'Insufficient funds: No spendable coins available in your wallet'
        } else if (msg.includes('Coin selection error')) {
          userMessage = 'Insufficient funds: Unable to select coins for this transaction'
        } else if (msg.includes('session not found') || msg.includes('pairing') || msg.includes('no matching key')) {
          userMessage = 'Wallet connection lost. Please reconnect your wallet.'
        }

        showToast(userMessage, 'error')
      }
      // If session missing/expired, prompt user to reconnect next time
      if (/session not found|pairing|no matching key|history:/i.test(msg)) {
        reset?.()
      }
    } finally {
      setBusy(false)
    }
  }

  // If neither Goby (desktop only) nor WalletConnect is connected, fall back to Dexie link behaviour
  if (!(gobyConnected && !isMobile) && !session) {
    return (
      <a
        href={`https://dexie.space/offers/${offerId}`}
        target="_blank"
        rel="noreferrer noopener"
        className={className}
        aria-label={ariaLabel || 'View offer on Dexie'}
        title={title || 'Dexie'}
        style={{ textDecoration: 'none' }}
      >
        {/* Render icon and Dexie label explicitly */}
        {children}
        <span style={{ marginLeft: 4 }}>{labelDefault}</span>
      </a>
    )
  }

  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={busy}
        title={title}
        aria-label={ariaLabel}
        style={{ cursor: busy ? 'default' : 'pointer' }}
      >
        {busy ? 'Taking…'
          : children
            ? <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {children}
                <span style={{ marginLeft: 4 }}>{isConnectedAny ? labelWhenSage : labelDefault}</span>
              </span>
            : (isConnectedAny ? labelWhenSage : labelDefault)
        }
      </button>
      {resultId && <span style={{ fontSize: 12 }}>Tx: {resultId}</span>}
    </div>
  )
}

