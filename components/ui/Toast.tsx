import { useEffect, useState } from 'react'
import { Icon } from 'semantic-ui-react'
import type { SemanticICONS } from 'semantic-ui-react/dist/commonjs/generic'

interface ToastProps {
  message: string
  type: 'error' | 'success' | 'warning' | 'info'
  isVisible: boolean
  onClose: () => void
  duration?: number
  link?: string
  linkText?: string
}

export function Toast({ message, type, isVisible, onClose, duration = 5000, link, linkText }: ToastProps) {
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

  const getIcon = (): SemanticICONS => {
    switch (type) {
      case 'error':
        return 'exclamation triangle'
      case 'success':
        return 'check circle'
      case 'warning':
        return 'warning sign'
      case 'info':
        return 'info circle'
      default:
        return 'info circle'
    }
  }

  const getColors = () => {
    switch (type) {
      case 'error':
        return { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626' }
      case 'success':
        return { bg: '#dcfce7', border: '#86efac', text: '#16a34a' }
      case 'warning':
        return { bg: '#fef3c7', border: '#fcd34d', text: '#d97706' }
      case 'info':
        return { bg: '#dbeafe', border: '#93c5fd', text: '#2563eb' }
      default:
        return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }
    }
  }

  const colors = getColors()

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
        gap: '12px',
      }}
    >
      <Icon
        name={getIcon()}
        style={{
          color: colors.text,
          fontSize: '18px',
          marginTop: '2px',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: colors.text,
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.4',
            wordBreak: 'break-word',
          }}
        >
          {message}
          {link && (
            <div style={{ marginTop: '8px' }}>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: colors.text,
                  textDecoration: 'underline',
                  fontSize: '12px',
                  fontWeight: 'normal',
                }}
              >
                {linkText || 'View Transaction'}
              </a>
            </div>
          )}
        </div>
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
          flexShrink: 0,
        }}
        aria-label="Close notification"
      >
        <Icon name="close" />
      </button>
    </div>
  )
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: 'error' | 'success' | 'warning' | 'info',
    link?: string,
    linkText?: string,
  ) => void
}

import { createContext, useContext, ReactNode } from 'react'

const ToastContext = createContext<ToastContextType | null>(null)

let toastIdCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<
    Array<{
      id: number
      message: string
      type: 'error' | 'success' | 'warning' | 'info'
      link?: string
      linkText?: string
    }>
  >([])

  const showToast = (
    message: string,
    type: 'error' | 'success' | 'warning' | 'info' = 'info',
    link?: string,
    linkText?: string,
  ) => {
    const id = ++toastIdCounter
    setToasts((prev) => {
      const newToasts = [...prev, { id, message, type, link, linkText }]
      return newToasts.slice(-5) // Limit concurrent toasts
    })
  }

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => removeToast(toast.id)}
          link={toast.link}
          linkText={toast.linkText}
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
