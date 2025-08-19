import React from 'react'

type Props = {
  offerId: string
  children?: React.ReactNode
  className?: string
  title?: string
  ariaLabel?: string
  labelDefault?: string
  labelWhenSage?: string // Not used since Mintgarden doesn't support WalletConnect
}

export function TakeMintgardenOfferButton({ offerId, children, className, title, ariaLabel, labelDefault = 'Mintgarden' }: Props) {
  // Mintgarden doesn't support WalletConnect offer taking, so we don't need wallet state

  function handleClick() {
    // Mintgarden doesn't provide raw offer files for WalletConnect
    // Always redirect to Mintgarden regardless of wallet connection status
    window.open(`https://mintgarden.io/offers/${offerId}`, '_blank', 'noopener,noreferrer')
  }

  // Mintgarden always opens in new tab since they don't support WalletConnect offer taking
  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      title={title || 'View offer on Mintgarden'}
      aria-label={ariaLabel || 'View offer on Mintgarden'}
      style={{ cursor: 'pointer', textDecoration: 'none' }}
    >
      {/* Render icon and Mintgarden label */}
      {children}
      <span style={{ marginLeft: 4 }}>{labelDefault}</span>
      {/* Always show external link icon since it always opens externally */}
      <i aria-hidden="true" className="external small icon" style={{ marginLeft: 4 }}></i>
    </button>
  )
}
