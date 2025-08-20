import React from 'react'
import { getNextMintBadge } from '../lib/mintgarden-api'

interface NextMintBadgeDisplayProps {
  totalSold?: number
  className?: string
  showPoints?: boolean
  compact?: boolean
}

/**
 * Component to display the badge a user will get for their next mint
 */
const NextMintBadgeDisplay: React.FC<NextMintBadgeDisplayProps> = ({
  totalSold = 0,
  className = '',
  showPoints = false,
  compact = false
}) => {
  const nextBadge = getNextMintBadge(totalSold)
  
  if (compact) {
    return (
      <span 
        className={className}
        title={`Next mint badge: ${nextBadge.name}${showPoints ? ` (${nextBadge.points} $G4M)` : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 11,
          fontWeight: 500
        }}
      >
        <span style={{ fontSize: 14 }}>{nextBadge.emoji}</span>
        {nextBadge.name}
        {showPoints && (
          <span style={{ 
            fontSize: 10, 
            opacity: 0.8,
            marginLeft: 2
          }}>
            {nextBadge.points}
          </span>
        )}
      </span>
    )
  }
  
  return (
    <div 
      className={className}
      title={`Next mint will receive ${nextBadge.name} badge (${nextBadge.points} $G4M points)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 999,
        background: 'var(--color-chip-bg, rgba(127,127,127,0.15))',
        border: '1px solid var(--color-border)',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-text)'
      }}
    >
      <span style={{ fontSize: 16 }}>{nextBadge.emoji}</span>
      <span>Next: {nextBadge.name}</span>
      {showPoints && (
        <span style={{ 
          fontSize: 10, 
          opacity: 0.8,
          marginLeft: 2
        }}>
          ({nextBadge.points} $G4M)
        </span>
      )}
    </div>
  )
}

export default NextMintBadgeDisplay
