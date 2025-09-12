import React, { useState } from 'react'
import { useJsonRpc } from '../../lib/wallet/JsonRpcContext'
import { useWalletConnect } from '../../lib/wallet/WalletConnectContext'
import { useGoby } from '../../lib/wallet/GobyContext'
import { useToast } from '../ui/Toast'
import { useViewport } from '../../hooks/useViewport'

type Props = {
  offerId: string
  children?: React.ReactNode
  className?: string
  title?: string
  ariaLabel?: string
  labelDefault?: string
  labelWhenSage?: string
}

export function TakeOfferButton({
  offerId,
  children,
  className,
  title,
  ariaLabel,
  labelDefault = 'Dexie',
  labelWhenSage = 'Take Offer',
}: Props) {
  const { chiaTakeOffer } = useJsonRpc()
  const { session, connect, reset } = useWalletConnect()
  const {
    isAvailable: gobyAvailable,
    isConnected: gobyConnected,
    connect: gobyConnect,
    disconnect: gobyDisconnect,
  } = useGoby()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const { isMobile } = useViewport()

  // Consider the user "connected" if either Goby (desktop only) or WalletConnect is connected
  const isConnectedAny = (gobyConnected && !isMobile) || !!session

  async function handleClick() {
    if (cooldown) return
    setBusy(true)
    try {
      // Ensure only one wallet is connected at a time
      // If WalletConnect is already connected, use it exclusively
      if (session) {
        // Disconnect Goby if it's connected while WalletConnect is active
        if (gobyConnected) {
          try {
            await gobyDisconnect()
          } catch {}
        }
      }
      // If Goby is already connected, use it exclusively
      else if (gobyConnected && !isMobile) {
        // Goby is already connected, use it
      }
      // If neither is connected, prefer Goby on desktop, WalletConnect otherwise
      else if (gobyAvailable && !isMobile) {
        try {
          await gobyConnect()
        } catch {}
      }
      // Fallback to WalletConnect if Goby connection failed or not available
      if (!gobyConnected && !session) {
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
      // r may be null/undefined or a generic object; guard access
      const txId = (r && typeof r === 'object' && (r as { id?: string }).id) || null
      if (txId) {
        // Show transaction success toast
        showToast('Offer accepted successfully!', 'success')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      const isRejection = /reject|denied|cancel|close|user.?reject|user.?denied|user.?cancel/i.test(msg)
      const isConnectionError =
        /session not found|pairing|no matching key|history:|please request after current approval resolve/i.test(msg)

      // Only reset wallet connections for actual connection errors, not user rejections
      if (isConnectionError) {
        // Reset the specific wallet that had the connection error
        if (msg.includes('session not found') || msg.includes('pairing') || msg.includes('no matching key')) {
          // WalletConnect connection error
          reset?.()
        } else if (msg.includes('please request after current approval resolve') && gobyConnected) {
          // Goby pending state error
          try {
            gobyDisconnect?.()
          } catch {}
        }
      }

      // Add a brief cooldown only for connection errors or pending state issues
      if (isConnectionError || msg.includes('please request after current approval resolve')) {
        setCooldown(true)
        setTimeout(() => setCooldown(false), 2000) // 2 second cooldown
      }

      // If user rejected or closed the request, don't show error toast
      if (!isRejection) {
        // Show user-friendly error messages via toast
        let userMessage = msg
        if (msg.includes('Coin selection error: no spendable coins')) {
          userMessage = 'Insufficient funds: No spendable coins available in your wallet'
        } else if (msg.includes('Coin selection error')) {
          userMessage = 'Insufficient funds: Unable to select coins for this transaction'
        } else if (msg.includes('session not found') || msg.includes('pairing') || msg.includes('no matching key')) {
          userMessage = 'Wallet connection lost. Please reconnect your wallet.'
        } else if (msg.includes('please request after current approval resolve')) {
          userMessage =
            'Wallet is still processing previous request. Try disconnecting and reconnecting your wallet, then try again.'
        }

        showToast(userMessage, 'error')
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
        disabled={busy || cooldown}
        title={cooldown ? 'Please wait...' : title}
        aria-label={ariaLabel}
        style={{ cursor: busy || cooldown ? 'default' : 'pointer' }}
      >
        {busy ? (
          'Taking…'
        ) : cooldown ? (
          'Wait...'
        ) : children ? (
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {children}
            <span style={{ marginLeft: 4 }}>{isConnectedAny ? labelWhenSage : labelDefault}</span>
          </span>
        ) : isConnectedAny ? (
          labelWhenSage
        ) : (
          labelDefault
        )}
      </button>
    </div>
  )
}
