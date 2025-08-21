import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Icon } from 'semantic-ui-react'
import { useGoby } from '../../lib/wallet/GobyContext'

function GobyButton({ onConnected }: { onConnected?: () => void }) {
  const { isAvailable, isConnected, connect } = useGoby()

  // Auto-close modal once Goby is connected
  useEffect(() => {
    if (isConnected) onConnected?.()
  }, [isConnected, onConnected])

  // Detect mobile devices - hide Goby button on mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Detect theme changes to flip text colour: black in dark mode, white in light mode
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const getDark = () => document.documentElement.getAttribute('data-theme') === 'dark'
    setIsDark(getDark())
    const obs = new MutationObserver(() => setIsDark(getDark()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Hide Goby button on mobile devices
  if (isMobile) {
    return null
  }

  const btnStyle = {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    margin: '8px 0 16px',
  } as const
  const textColour = isDark ? '#000000' : '#ffffff'

  if (!isAvailable) {
    return (
      <a
        href="https://chrome.google.com/webstore/detail/goby-chia-wallet/" target="_blank" rel="noreferrer noopener"
        className="copyBtn"
        style={{ ...btnStyle, color: textColour }}
      >
        <Icon name="chrome" /> Install Goby (Chrome)
      </a>
    )
  }

  if (!isConnected) {
    return (
      <button onClick={() => connect()} className="copyBtn" style={{ ...btnStyle, color: textColour }}>
        <Icon name="plug" /> Connect with Goby
      </button>
    )
  }

  return (
    <button className="copyBtn" style={{ ...btnStyle, color: textColour, backgroundColor: '#22c55e', cursor: 'default' }} disabled>
      <Icon name="check" /> Connected with Goby
    </button>
  )
}

function SupportedWalletsList() {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const wallets = isMobile
    ? ['Sage Wallet'] // Mobile: only Sage Wallet (WalletConnect compatible)
    : ['Sage Wallet', 'Chia Wallet'] // Desktop: WalletConnect compatible wallets first

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'var(--color-chip-bg)',
      borderRadius: '8px',
      border: '1px solid var(--color-border)'
    }}>
      <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600' }}>Supported Wallets:</p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {wallets.map((wallet) => (
          <span
            key={wallet}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              backgroundColor: 'var(--color-border)',
              borderRadius: '4px'
            }}
          >
            {wallet}
          </span>
        ))}
      </div>
    </div>
  )
}

interface CustomConnectModalProps {
  isOpen: boolean
  onClose: () => void
  qrCodeUri?: string
  isConnecting: boolean
  error?: string | null
}

export function CustomConnectModal({ isOpen, onClose, qrCodeUri, isConnecting, error }: CustomConnectModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Mobile detection - hide browser extension section on mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Generate QR code when URI changes
  useEffect(() => {
    if (!qrCodeUri) {
      setQrCodeDataUrl('')
      return
    }

    // Use QR code library to generate data URL
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(qrCodeUri, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(dataUrl => {
        setQrCodeDataUrl(dataUrl)
      }).catch(() => {
        setQrCodeDataUrl('')
      })
    }).catch(() => {
      // Fallback: show URI as text if QR library not available
      setQrCodeDataUrl('')
    })
  }, [qrCodeUri])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'var(--color-card-bg)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid var(--color-border)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image src="/collection-icon.png" alt="go4.me" width={32} height={32} />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Connect Wallet</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--color-text-subtle)'
            }}
            aria-label="Close"
          >
            <Icon name="close" size="large" />
          </button>
        </div>

        {/* Content */}
        {error ? (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <p style={{ margin: 0, color: '#ff4444' }}>{error}</p>
          </div>
        ) : null}

        {qrCodeUri ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '20px', color: 'var(--color-text)' }}>
              Scan this QR code with your Chia wallet to connect
            </p>
            <div style={{
              padding: '16px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              marginBottom: '20px',
              minHeight: '332px',
              minWidth: '332px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {qrCodeDataUrl ? (
                <Image
                  src={qrCodeDataUrl}
                  alt="WalletConnect QR Code"
                  width={300}
                  height={300}
                  unoptimized
                  style={{ display: 'block', width: '300px', height: '300px' }}
                />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #ccc',
                    borderTop: '3px solid #007bff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Generating QR code...</p>
                  <p style={{ margin: '8px 0 0', color: '#999', fontSize: '12px', wordBreak: 'break-all', maxWidth: '280px' }}>
                    {qrCodeUri.substring(0, 50)}...
                  </p>
                </div>
              )}
            </div>
            {/* Copy URI Button */}
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => {
                  if (!qrCodeUri) return
                  navigator.clipboard.writeText(qrCodeUri)
                    .then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1200)
                    })
                    .catch(() => {
                      // Silently fail if clipboard access is denied
                    })
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                className={`copyBtn${copied ? ' copied' : ''}`}
              >
                <Icon name={copied ? 'check' : 'copy'} />
                {copied ? 'Copied!' : 'Copy WalletConnect URI'}
              </button>
            </div>

            <SupportedWalletsList />

            {/* Goby as alternative option - only show on desktop */}
            {!isMobile && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--color-text-subtle)', textAlign: 'center' }}>
                  Or connect with browser extension:
                </p>
                <GobyButton onConnected={onClose} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--color-text-subtle)' }}>Preparing connection...</p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            Powered by WalletConnect • Secure & Decentralized
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .copyBtn {
          background: var(--color-link);
          transition: transform 120ms ease, filter 120ms ease, background 160ms ease;
        }
        .copyBtn:hover {
          filter: brightness(1.05);
          background: color-mix(in srgb, var(--color-link) 90%, white 10%);
        }
        .copyBtn:active {
          transform: scale(0.98);
        }
        .copyBtn.copied {
          background: #22c55e; /* green to confirm copy */
        }
      `}</style>
    </div>
  )
}
