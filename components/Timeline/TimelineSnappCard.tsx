import React from 'react'
import Image from 'next/image'
import { snappImageUrls } from '../../lib/database/services/timeline'
import styles from './TimelineSnappCard.module.css'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = () => setReduced(mq.matches)
    handler()
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

export interface TimelineSnappCardProps {
  ipfs_cid?: string | null
  title?: string | null
  subtitle?: string | null
  description?: string | null
  created_at?: string | null
  last_offer_created_at?: string | null
  author_id?: string | null
  last_offer_id?: string | null
  username?: string | null
  user_display_name?: string | null
  user_pfp_ipfs_cid?: string | null
  last_edition_number?: number | null
}

export default function TimelineSnappCard(props: TimelineSnappCardProps) {
  const {
    ipfs_cid,
    title,
    description,
    created_at,
    last_offer_created_at,
    last_offer_id,
    username,
    user_display_name,
    user_pfp_ipfs_cid,
    last_edition_number,
  } = props
  const [flipped, setFlipped] = React.useState(false)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const [generatedLoaded, setGeneratedLoaded] = React.useState(false)
  const [sourceLoaded, setSourceLoaded] = React.useState(false)

  const { generated, source } = snappImageUrls(ipfs_cid)
  const dexieUrl = last_offer_id ? `https://dexie.space/offers/${last_offer_id}` : undefined
  const slugifiedTitle = (title ?? 'go4snapp')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const generatedDownloadName = `${slugifiedTitle || 'go4snapp'}-generated.png`
  const sourceDownloadName = `${slugifiedTitle || 'go4snapp'}-source.png`

  const userPfpUrl =
    user_pfp_ipfs_cid && username ? `https://can.seedsn.app/ipfs/${user_pfp_ipfs_cid}/${username}-go4me.png` : undefined

  const toggle = () => setFlipped((f) => !f)
  const showDate = last_offer_created_at ?? created_at ?? ''
  const formattedDate = showDate
    ? new Date(showDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : ''

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInDays < 7) return `${diffInDays}d`
    return formattedDate
  }

  const relativeTime = showDate ? getRelativeTime(showDate) : ''

  return (
    <article className={styles.snappCard} onMouseLeave={() => !reducedMotion && setFlipped(false)}>
      <div className={styles.flipWrap} onMouseEnter={() => !reducedMotion && setFlipped(true)}>
        <h3 className={styles.cardTitle}>{title ?? 'Go4Snapp'}</h3>
        <button
          type="button"
          className={styles.flipInner}
          aria-pressed={flipped}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggle()
            }
          }}
        >
          <div className={`${styles.flipFace} ${styles.front}`}>
            {generated && (
              <Image
                src={generated}
                alt={title ?? 'Generated Go4Snapp'}
                fill
                sizes="550px"
                onLoad={() => {
                  setGeneratedLoaded(true)
                }}
                style={{ objectFit: 'cover' }}
                priority={false}
                className={`${styles.snappImage} ${generatedLoaded ? styles.visible : ''}`}
              />
            )}
          </div>
          <div className={`${styles.flipFace} ${styles.back}`}>
            {source && (
              <Image
                src={source}
                alt={title ? `${title} (source)` : 'Source Go4Snapp'}
                fill
                sizes="550px"
                onLoad={() => {
                  setSourceLoaded(true)
                }}
                style={{ objectFit: 'contain' }}
                priority={false}
                className={`${styles.snappImage} ${sourceLoaded ? styles.visible : ''}`}
              />
            )}
          </div>
        </button>
      </div>
      <div className={styles.cardMeta}>
        {(user_display_name || username) && (
          <div className={styles.cardUser}>
            {userPfpUrl && username && (
              <a href={`https://${username}.go4.me`} target="_blank" rel="noopener noreferrer">
                <Image
                  src={userPfpUrl}
                  alt={`${user_display_name || username}'s profile picture`}
                  width={48}
                  height={48}
                  className={styles.cardUserPfp}
                />
              </a>
            )}
            <div className={styles.cardUserInfo}>
              <span className={styles.cardUserDisplayName}>{user_display_name || username}</span>
              {user_display_name && username && (
                <a
                  href={`https://x.com/${username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardUserUsername}
                >
                  @{username}
                </a>
              )}
            </div>
            <div className={styles.cardUserMeta}>
              {relativeTime && <span className={styles.cardUserDate}>{relativeTime}</span>}
              <div className={styles.dropdownContainer} ref={dropdownRef}>
                <button
                  type="button"
                  className={styles.moreButton}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  aria-label="More options"
                >
                  ⋯
                </button>
                {dropdownOpen && (
                  <div className={styles.moreMenu}>
                    {source ? (
                      <a
                        className={styles.moreMenuItem}
                        href={source}
                        download={sourceDownloadName}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className={styles.downloadIcon}>⬇️</span>
                        Original
                      </a>
                    ) : (
                      <span className={`${styles.moreMenuItem} ${styles.moreMenuItemDisabled}`}>
                        <span className={styles.downloadIcon}>⬇️</span>
                        Original
                      </span>
                    )}
                    {generated ? (
                      <a
                        className={styles.moreMenuItem}
                        href={generated}
                        download={generatedDownloadName}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className={styles.downloadIcon}>⬇️</span>
                        go4snapp
                      </a>
                    ) : (
                      <span className={`${styles.moreMenuItem} ${styles.moreMenuItemDisabled}`}>
                        <span className={styles.downloadIcon}>⬇️</span>
                        go4snapp
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {description && <p className={styles.cardDescription}>{description}</p>}
        <div className={styles.cardActions}>
          {dexieUrl ? (
            <a
              className={`${styles.cardAction} ${styles.cardActionDexie}`}
              href={dexieUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View offer on Dexie"
            >
              <Image
                src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                alt="Dexie"
                width={16}
                height={16}
              />
              Get #{last_edition_number} at Dexie
            </a>
          ) : (
            <button type="button" className={`${styles.cardAction} ${styles.cardActionDisabled}`} disabled>
              Dexie unavailable
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
