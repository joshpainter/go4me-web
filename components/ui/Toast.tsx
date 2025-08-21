import { useEffect, useState } from 'react'
import { Icon } from 'semantic-ui-react'

interface ToastProps {
  message: string
  type: 'error' | 'success' | 'warning' | 'info' | 'transaction'
  isVisible: boolean
  onClose: () => void
  duration?: number
  transactionHash?: string
}

export function Toast({ message, type, isVisible, onClose, duration = 5000, transactionHash }: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(false)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible && !isAnimating) return null

  const getIcon = () => {
    switch (type) {
      case 'error': return 'exclamation triangle'
      case 'success': return 'check circle'
      case 'transaction': return 'check circle'
      case 'warning': return 'warning sign'
      case 'info': return 'info circle'
      default: return 'info circle'
    }
  }

  const getColors = () => {
    switch (type) {
      case 'error': return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }
      case 'success': return { bg: '#dcfce7', border: '#86efac', text: '#16a34a' }
      case 'transaction': return { bg: '#dcfce7', border: '#86efac', text: '#16a34a' }
      case 'warning': return { bg: '#fef3c7', border: '#fcd34d', text: '#d97706' }
      case 'info': return { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb' }
      default: return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }
    }
  }

  const colors = getColors()

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const openInExplorer = (hash: string) => {
    window.open(`https://www.spacescan.io/xch/tx/${hash}`, '_blank')
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        maxWidth: '400px',
        minWidth: '300px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}
    >
      <Icon 
        name={getIcon() as any} 
        style={{ 
          color: colors.text, 
          fontSize: '18px',
          marginTop: '2px',
          flexShrink: 0
        }} 
      />
      <div style={{ flex: 1 }}>
        <div style={{
          color: colors.text,
          fontSize: '14px',
          fontWeight: '500',
          lineHeight: '1.4',
          wordBreak: 'break-word'
        }}>
          {message}
        </div>
        {type === 'transaction' && transactionHash && (
          <div style={{ marginTop: '12px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '6px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
                fontSize: '12px',
                color: '#333',
                flex: 1,
                wordBreak: 'break-all'
              }}>
                Tx: {transactionHash}
              </span>
              <button
                onClick={() => copyToClipboard(transactionHash)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                title="Copy to clipboard"
              >
                📋
              </button>
              <button
                onClick={() => openInExplorer(transactionHash)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                title="View in explorer"
              >
                🔗
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          color: colors.text,
          opacity: 0.7,
          fontSize: '16px',
          flexShrink: 0
        }}
        aria-label="Close notification"
      >
        <Icon name="close" />
      </button>
    </div>
  )
}

interface ToastContextType {
  showToast: (message: string, type?: 'error' | 'success' | 'warning' | 'info') => void
  showTransactionSuccess: (transactionHash: string, message?: string) => void
}

import { createContext, useContext, ReactNode } from 'react'

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{
    id: number;
    message: string;
    type: 'error' | 'success' | 'warning' | 'info' | 'transaction';
    transactionHash?: string;
  }>>([])

  const showToast = (message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const showTransactionSuccess = (transactionHash: string, message: string = 'Transaction successful!') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type: 'transaction', transactionHash }])
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, showTransactionSuccess }}>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => removeToast(toast.id)}
          transactionHash={toast.transactionHash}
        />
      ))}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
