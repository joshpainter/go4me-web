import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useWalletConnect } from '../../lib/wallet/WalletConnectContext'
import { useJsonRpc } from '../../lib/wallet/JsonRpcContext'
import { useGoby } from '../../lib/wallet/GobyContext'
import { useToast } from '../ui/Toast'

// Small, global wallet control fixed at the top-right.
// Shows a compact button with wallet id + type; clicking reveals details and a
// disconnect action. Also handles Dexie offer hand-off on connect.
export default function GlobalWalletBar({ inline = false }: { inline?: boolean }) {
  const { isInitializing, session, accounts, connect, disconnect } = useWalletConnect()
  const { chiaTakeOffer } = useJsonRpc()
  const { showToast } = useToast()
  const { isConnected: gobyConnected, accounts: gobyAccounts, disconnect: gobyDisconnect } = useGoby()

  const [open, setOpen] = useState(false)
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null)
  const [pendingOfferStr, setPendingOfferStr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resultId, setResultId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const hasTriggeredRef = useRef(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const primaryAccount = useMemo(
    () => (gobyConnected && !isMobile ? gobyAccounts?.[0] || '' : accounts?.[0] || ''),
    [gobyConnected, gobyAccounts, accounts, isMobile],
  )

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Track mobile vs desktop for responsive sizing
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Position just below stickyTopbar when present; otherwise, near top-right
  const [topOffset, setTopOffset] = useState(8)
  const [layer, setLayer] = useState(1200)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const compute = () => {
      const el = document.querySelector('.stickyTopbar') as HTMLElement | null
      if (el) {
        const h = el.getBoundingClientRect().height || 50
        setTopOffset(Math.round(h + 8))
        setLayer(1101) // stickyTopbar is 1100; sit just above it
      } else {
        setTopOffset(8)
        setLayer(1200)
      }
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // Parse URL for offer id or offer string. Support several param names.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)

    const rawOffer = url.searchParams.get('offer') || url.searchParams.get('dexieOffer') || url.searchParams.get('o')
    const rawOfferId = url.searchParams.get('offerId') || url.searchParams.get('id')

    if (rawOffer && /^offer[a-z0-9]+/i.test(rawOffer)) {
      setPendingOfferStr(rawOffer)
      sessionStorage.setItem('pendingOfferStr', rawOffer)
    } else if (rawOffer && !rawOfferId) {
      setPendingOfferId(rawOffer)
      sessionStorage.setItem('pendingOfferId', rawOffer)
    }

    if (rawOfferId) {
      setPendingOfferId(rawOfferId)
      sessionStorage.setItem('pendingOfferId', rawOfferId)
    }

    const storedStr = sessionStorage.getItem('pendingOfferStr')
    const storedId = sessionStorage.getItem('pendingOfferId')
    if (!rawOffer && storedStr) setPendingOfferStr(storedStr)
    if (!rawOfferId && storedId) setPendingOfferId(storedId)
  }, [])

  // Automatically submit the pending Dexie offer once connected (only for WalletConnect, not Goby on mobile)
  useEffect(() => {
    if (!session || hasTriggeredRef.current) return
    if (!pendingOfferStr && !pendingOfferId) return

    const run = async () => {
      setBusy(true)
      setResultId(null)
      try {
        let offer: string | null = pendingOfferStr
        if (!offer && pendingOfferId) {
          const res = await fetch(`https://api.dexie.space/v1/offers/${pendingOfferId}`)
          if (!res.ok) throw new Error('Failed to fetch offer from Dexie')
          const data = await res.json()
          offer =
            typeof data === 'string' && data.startsWith('offer')
              ? data
              : data.offer?.offer || data.offer || data?.data?.offer
        }
        if (!offer || typeof offer !== 'string') throw new Error('No offer found to submit')
        const r = (await chiaTakeOffer({ offer })) as { id: string }
        setResultId(r.id)
        showToast('Offer accepted successfully! Transaction submitted to the blockchain.', 'success')
        setPendingOfferId(null)
        setPendingOfferStr(null)
        sessionStorage.removeItem('pendingOfferId')
        sessionStorage.removeItem('pendingOfferStr')
      } catch (e: unknown) {
        const msg = (e as { message?: string } | null)?.message || String(e)
        const isRejection = /reject|denied|cancel|close|user.?reject|user.?denied|user.?cancel/i.test(msg)
        const isConnectionError =
          /session not found|pairing|no matching key|history:|please request after current approval resolve/i.test(msg)

        // Only reset wallet connections for actual connection errors, not user rejections
        if (isConnectionError) {
          // Reset the specific wallet that had the connection error
          if (msg.includes('session not found') || msg.includes('pairing') || msg.includes('no matching key')) {
            // WalletConnect connection error
            disconnect?.()
          } else if (msg.includes('please request after current approval resolve') && gobyConnected) {
            // Goby pending state error
            try {
              gobyDisconnect?.()
            } catch {}
          }
        }

        // Only show error toast if it's not a user rejection
        if (!isRejection) {
          let userMessage = msg
          if (msg.includes('Coin selection error: no spendable coins')) {
            userMessage = 'Insufficient funds: No spendable coins available in your wallet'
          } else if (msg.includes('Coin selection error')) {
            userMessage = 'Insufficient funds: Unable to select coins for this transaction'
          } else if (msg.includes('please request after current approval resolve')) {
            userMessage =
              'Wallet is still processing previous request. Try disconnecting and reconnecting your wallet, then try again.'
          }
          showToast(userMessage, 'error')
        }
      } finally {
        setBusy(false)
        hasTriggeredRef.current = true
      }
    }
    run()
  }, [session, pendingOfferStr, pendingOfferId, chiaTakeOffer, showToast, disconnect, gobyConnected, gobyDisconnect])

  // Always render icon-only UI; full/short labels removed per design

  const walletName = useMemo(() => {
    if (gobyConnected && !isMobile) return 'Goby'
    const meta = (session as unknown as { peer?: { metadata?: { name?: string } } } | null)?.peer?.metadata
    return meta?.name || 'Wallet'
  }, [session, gobyConnected, isMobile])

  async function handleConnect() {
    try {
      // Always start a fresh pairing to avoid stale keys/pairings issues
      await connect()
    } catch {}
  }

  // Minimal styles; place inside existing sticky top bar area to avoid overlapping UI
  // If a sticky top bar exists, shift chip left so it does not cover the theme toggle
  const rightOffset = isMobile ? 10 : 160
  const boxStyle: React.CSSProperties = inline
    ? {
        position: 'static',
        display: 'inline-flex',
        alignItems: 'center',
        gap: isMobile ? 6 : 8,
        padding: 0,
        background: 'transparent',
      }
    : {
        position: 'fixed',
        top: topOffset,
        right: rightOffset,
        zIndex: layer,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: 0,
        background: 'transparent',
      }
  const chipStyle: React.CSSProperties = {
    padding: isMobile ? '4px 6px' : '6px 8px',
    borderRadius: isMobile ? 10 : 12,
    border: '1px solid var(--color-border)',
    background: 'var(--color-card-bg)',
    cursor: 'pointer',
    fontSize: isMobile ? 10 : 12,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobile ? 3 : 6,
    maxWidth: isMobile ? 200 : 220,
    lineHeight: 0,
    color: 'var(--color-text)',
  }

  // When used inline in the header, match the dark mode button height (34px) at all widths
  const chipStyleInlineOverride: React.CSSProperties = inline
    ? {
        height: 34,
        padding: '0 12px',
        borderRadius: 4,
        ...(isMobile ? {} : { maxWidth: 'none' }),
      }
    : {}

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    background: 'var(--color-surface, rgba(255,255,255,0.97))',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
    padding: isMobile ? 10 : 14,
    minWidth: isMobile ? 220 : 300,
    maxWidth: isMobile ? 300 : 380,
  }
  const darkPanel: React.CSSProperties = {
    background: 'rgba(22, 24, 28, 0.96)',
  }
  const subtleText: React.CSSProperties = { fontSize: 12, color: 'var(--color-text-subtle)' }
  const mono: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  }
  const actionBtn: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--color-border)',
    background: 'var(--color-card-bg)',
    color: 'var(--color-text)',
    cursor: 'pointer',
  }

  const themeIsDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'

  return (
    <div ref={rootRef} style={boxStyle} className="wallet-chip">
      {isInitializing && (
        <div style={{ ...chipStyle, ...chipStyleInlineOverride }} aria-live="polite" title="Connecting to wallet…">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
            <path
              d="M2 4C2 3.44772 2.44772 3 3 3H13C13.5523 3 14 3.44772 14 4V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="11" cy="9.5" r="0.75" fill="currentColor" />
          </svg>
        </div>
      )}

      {!isInitializing && gobyConnected && !session && !isMobile && (
        <>
          <button
            style={{ ...chipStyle, ...chipStyleInlineOverride, color: '#22c55e' }}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
            title={`Goby • ${primaryAccount}`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
              <path
                d="M2 4C2 3.44772 2.44772 3 3 3H13C13.5523 3 14 3.44772 14 4V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="11" cy="9.5" r="0.75" fill="currentColor" />
            </svg>
          </button>

          {open && (
            <div role="dialog" aria-label="Wallet details" style={{ ...panelStyle, ...(themeIsDark ? darkPanel : {}) }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>Goby</div>
                <div style={subtleText}>Network</div>
                <div style={{ fontSize: 12 }}>chia:mainnet</div>
                <div style={subtleText}>Account</div>
                <div style={{ ...mono, fontSize: 12, wordBreak: 'break-all' }}>{primaryAccount || '(none)'}</div>
                {busy && <div style={{ fontSize: 12 }}>Processing Dexie offer…</div>}
                {resultId && <div style={{ fontSize: 12 }}>Tx: {resultId}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    style={actionBtn}
                    onClick={() => {
                      setOpen(false)
                      gobyDisconnect()
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!isInitializing && !session && !gobyConnected && (
        <button
          style={{ ...chipStyle, ...chipStyleInlineOverride }}
          onClick={handleConnect}
          aria-label="Connect wallet"
          title="Connect wallet"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
            <path
              d="M2 4C2 3.44772 2.44772 3 3 3H13C13.5523 3 14 3.44772 14 4V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="11" cy="9.5" r="0.75" fill="currentColor" />
          </svg>
        </button>
      )}

      {!isInitializing && session && (
        <>
          <button
            style={{ ...chipStyle, ...chipStyleInlineOverride, color: '#22c55e' }} // Green when connected
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
            title={`${walletName} • ${accounts?.[0] || ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
              <path
                d="M2 4C2 3.44772 2.44772 3 3 3H13C13.5523 3 14 3.44772 14 4V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="11" cy="9.5" r="0.75" fill="currentColor" />
            </svg>
          </button>

          {open && (
            <div role="dialog" aria-label="Wallet details" style={{ ...panelStyle, ...(themeIsDark ? darkPanel : {}) }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{walletName}</div>
                <div style={subtleText}>Network</div>
                <div style={{ fontSize: 12 }}>chia:mainnet</div>
                <div style={subtleText}>Account</div>
                <div style={{ ...mono, fontSize: 12, wordBreak: 'break-all' }}>{accounts?.[0] || '(none)'}</div>
                {busy && <div style={{ fontSize: 12 }}>Processing Dexie offer…</div>}
                {resultId && <div style={{ fontSize: 12 }}>Tx: {resultId}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    style={actionBtn}
                    onClick={() => {
                      setOpen(false)
                      disconnect()
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
