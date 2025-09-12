import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { formatEtaFromQueue, formatInt, formatRelativeAgo, formatXCH } from '../lib/format'
import { TakeOfferButton } from './wallet/TakeOfferButton'
import type { HomeUser } from '../lib/database/services/mappers'
import { useEffect, useState } from 'react'

export type LeaderboardView =
  | 'totalSold'
  | 'totalTraded'
  | 'badgeScore'
  | 'shadowScore'
  | 'rarest'
  | 'recentTrades'
  | 'marmotRecovery'
  | 'queue'

export function PfpFlipCard({
  user,
  rootHostForLinks,
  idx,
}: {
  user: HomeUser
  rootHostForLinks?: string
  idx: number
}) {
  const profileHref = user.username ? `//${user.username}.${rootHostForLinks || 'go4.me'}/` : undefined
  const commonAlt = `${user.username || 'user'} avatar`

  const [isFlipped, setIsFlipped] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const nav = navigator as Navigator & { msMaxTouchPoints?: number }
    const touchCapable = 'ontouchstart' in window || nav.maxTouchPoints > 0 || (nav.msMaxTouchPoints ?? 0) > 0
    setIsTouch(!!touchCapable)
  }, [])

  const flipInnerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0 as unknown as number,
    transformStyle: 'preserve-3d',
    transition: 'transform 360ms cubic-bezier(0.2, 0.7, 0.2, 1)',
    willChange: 'transform',
    transform: (isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)') + ' translateZ(0)',
  }
  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0 as unknown as number,
    backfaceVisibility: 'hidden',
    transform: 'translateZ(0)',
    borderRadius: 8,
    overflow: 'hidden',
  }
  const backStyle: React.CSSProperties = {
    ...faceStyle,
    transform: 'rotateY(180deg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div
      className={styles.cardImgWrap}
      style={{ position: 'relative' }}
      onMouseEnter={() => {
        if (!isTouch) setIsFlipped(true)
      }}
      onMouseLeave={() => {
        if (!isTouch) setIsFlipped(false)
      }}
      onClick={(e) => {
        if (isTouch) {
          e.preventDefault()
          setIsFlipped((v) => !v)
        }
      }}
    >
      <div style={{ position: 'absolute', inset: 0, perspective: 900 }} className={styles.preserve3d}>
        <div style={flipInnerStyle} className={styles.preserve3d}>
          {/* Front */}
          <div style={faceStyle} className={styles.backfaceHidden}>
            {profileHref ? (
              <a href={profileHref} aria-label={`Open ${user.username}.go4.me`}>
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Image
                    src={user.avatarUrl}
                    alt={commonAlt}
                    fill
                    sizes="(max-width: 640px) 150px, 200px"
                    style={{ objectFit: 'cover' }}
                    priority={idx < 4}
                    fetchPriority={idx < 4 ? 'high' : 'auto'}
                  />
                </div>
              </a>
            ) : (
              <div style={{ position: 'absolute', inset: 0 }}>
                <Image
                  src={user.avatarUrl}
                  alt={commonAlt}
                  fill
                  sizes="(max-width: 640px) 150px, 200px"
                  style={{ objectFit: 'cover' }}
                  priority={idx < 4}
                  fetchPriority={idx < 4 ? 'high' : 'auto'}
                />
              </div>
            )}
          </div>
          {/* Back (circle mask) */}
          <div style={backStyle} className={styles.backfaceHidden}>
            {profileHref ? (
              <a
                href={profileHref}
                aria-label={`Open ${user.username}.go4.me`}
                style={{ position: 'absolute', inset: 0 }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '80%',
                    height: '80%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  <Image
                    src={user.xPfpUrl || user.avatarUrl}
                    alt={commonAlt}
                    fill
                    sizes="(max-width: 640px) 150px, 200px"
                    style={{ objectFit: 'cover' }}
                    priority={idx < 4}
                    fetchPriority={idx < 4 ? 'high' : 'auto'}
                  />
                </div>
              </a>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '80%',
                  height: '80%',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                }}
              >
                <Image
                  src={user.xPfpUrl || user.avatarUrl}
                  alt={commonAlt}
                  fill
                  sizes="(max-width: 640px) 150px, 200px"
                  style={{ objectFit: 'cover' }}
                  priority={idx < 4}
                  fetchPriority={idx < 4 ? 'high' : 'auto'}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PfpCard({
  user,
  view,
  rootHostForLinks,
  index,
}: {
  user: HomeUser
  view: LeaderboardView
  rootHostForLinks?: string
  index: number
}) {
  const rankValue =
    view === 'queue'
      ? user.rankQueuePosition || index + 1
      : view === 'totalTraded'
        ? user.rankTotalTradedValue || user.rankCopiesSold || index + 1
        : view === 'badgeScore'
          ? user.rankTotalBadgeScore || index + 1
          : view === 'shadowScore'
            ? user.rankTotalShadowScore || index + 1
            : view === 'recentTrades'
              ? user.rankLastSale || index + 1
              : view === 'rarest'
                ? user.rankFewestCopiesSold || index + 1
                : user.rankCopiesSold || index + 1

  return (
    <div className={styles.lbCard}>
      <div
        className={styles.rankBadge}
        style={{ backgroundColor: 'var(--badge-bg-solid)', color: 'var(--badge-fg-solid)' }}
      >
        #{rankValue}
      </div>
      <PfpFlipCard user={user} rootHostForLinks={rootHostForLinks} idx={index} />
      <div className={styles.cardBody}>
        {user.username ? (
          <div className={styles.username}>
            <a
              href={`//${user.username}.${rootHostForLinks || 'go4.me'}/`}
              style={{ color: 'inherit', textDecoration: 'none' }}
              aria-label={`Open ${user.username}.${rootHostForLinks || 'go4.me'}`}
            >
              @{user.username}
            </a>
          </div>
        ) : (
          <div className={styles.username}>@{user.username}</div>
        )}
        {user.fullName && <div className={styles.fullName}>{user.fullName}</div>}

        {(view === 'totalSold' || view === 'rarest' || view === 'marmotRecovery') && (
          <>
            <div className={styles.badgeRow}>
              <span className={styles.miniBadge} title="Total sold">
                Sold {user.totalSold}
              </span>
              <span className={styles.miniBadge} title="XCH total sold">
                {formatXCH(user.totalTradedXCH || 0)} XCH
              </span>
            </div>
            <div className={styles.badgeRow}>
              <span className={styles.miniBadge} title="Royalties">
                Royalties {formatXCH(user.totalRoyaltiesXCH || (user.totalTradedXCH || 0) * 0.1)} XCH
              </span>
            </div>
            <div className={styles.badgeRow}>
              {user.lastOfferId && user.lastOfferStatus === 0 ? (
                <>
                  <TakeOfferButton
                    offerId={user.lastOfferId}
                    className={styles.miniBadge}
                    ariaLabel="Take offer via WalletConnect"
                    title="Buy with WalletConnect"
                    labelDefault="Dexie"
                    labelWhenSage="Take Offer"
                  >
                    <Image
                      src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                      alt="Dexie"
                      width={16}
                      height={16}
                    />
                  </TakeOfferButton>
                  <a
                    href={`https://mintgarden.io/offers/${user.lastOfferId}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.miniBadge}
                    aria-label="View latest offer on Mintgarden"
                    title="Mintgarden"
                  >
                    <Image src="https://mintgarden.io/mint-logo-round.svg" alt="MintGarden" width={16} height={16} />
                    Mintgarden
                  </a>
                </>
              ) : (
                <span className={`${styles.miniBadge} ${styles.warningBadge}`}>
                  {Number.isFinite(user?.rankQueuePosition) && (user.rankQueuePosition || 0) > 0
                    ? `Next mint in ~${formatEtaFromQueue(user.rankQueuePosition)}`
                    : 'Next Copy Coming Soon!'}
                </span>
              )}
            </div>
          </>
        )}

        {view === 'totalTraded' && (
          <>
            <div className={styles.badgeRow}>
              <span className={styles.miniBadge} title="XCH total sold">
                {formatXCH(user.totalTradedXCH || 0)} XCH
              </span>
              <span className={styles.miniBadge} title="Total sold">
                Sold {user.totalSold}
              </span>
            </div>
            <div className={styles.badgeRow}>
              <span className={styles.miniBadge} title="Royalties">
                Royalties {formatXCH(user.totalRoyaltiesXCH || (user.totalTradedXCH || 0) * 0.1)} XCH
              </span>
            </div>
            <div className={styles.badgeRow}>
              {user.lastOfferId && user.lastOfferStatus === 0 ? (
                <>
                  <TakeOfferButton
                    offerId={user.lastOfferId}
                    className={styles.miniBadge}
                    ariaLabel="Take offer via WalletConnect"
                    title="Buy with WalletConnect"
                    labelDefault="Dexie"
                    labelWhenSage="Take Offer"
                  >
                    <Image
                      src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                      alt="Dexie"
                      width={16}
                      height={16}
                    />
                  </TakeOfferButton>
                  <a
                    href={`https://mintgarden.io/offers/${user.lastOfferId}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.miniBadge}
                    aria-label="View latest offer on Mintgarden"
                    title="Mintgarden"
                  >
                    <Image src="https://mintgarden.io/mint-logo-round.svg" alt="MintGarden" width={16} height={16} />
                    Mintgarden
                  </a>
                </>
              ) : (
                <span className={`${styles.miniBadge} ${styles.warningBadge}`}>
                  {Number.isFinite(user?.rankQueuePosition) && (user.rankQueuePosition || 0) > 0
                    ? `Next mint in ~${formatEtaFromQueue(user.rankQueuePosition)}`
                    : 'Next Copy Coming Soon!'}
                </span>
              )}
            </div>
          </>
        )}

        {view === 'badgeScore' && (
          <div className={styles.badgeRow}>
            <span className={`${styles.miniBadge} ${styles.primaryBadge}`} title="Badge Score">
              Badge {formatInt(user.totalBadgeScore)}
            </span>
          </div>
        )}

        {view === 'shadowScore' && (
          <div className={styles.badgeRow}>
            <span className={`${styles.miniBadge} ${styles.dangerBadge}`} title="Shadow Score">
              Shadow {formatInt(user.totalShadowScore)}
            </span>
          </div>
        )}

        {view === 'queue' && (
          <div className={styles.badgeRow}>
            <span className={styles.miniBadge} title="Next edition number">
              Next Edition #{(user.totalSold || 0) + 1}
            </span>
            <span className={`${styles.miniBadge} ${styles.warningBadge}`} title="Estimated time to mint">
              Next mint in ~{formatEtaFromQueue(user.rankQueuePosition ?? 0)}
            </span>
          </div>
        )}

        {view === 'recentTrades' && user.lastSaleAtMs && (
          <div className={styles.badgeRow}>
            <span
              suppressHydrationWarning
              className={styles.miniBadge}
              title={new Date(user.lastSaleAtMs).toLocaleString()}
            >
              Last sale {formatRelativeAgo(user.lastSaleAtMs)}
            </span>
          </div>
        )}

        {view !== 'totalSold' &&
          view !== 'totalTraded' &&
          view !== 'rarest' &&
          view !== 'queue' &&
          view !== 'marmotRecovery' && (
            <>
              {user.lastOfferId && user.lastOfferStatus === 0 && (
                <div className={styles.badgeRow}>
                  <TakeOfferButton
                    offerId={user.lastOfferId}
                    className={styles.miniBadge}
                    ariaLabel="Take offer via WalletConnect or view on Dexie"
                    title="Dexie"
                    labelDefault="Dexie"
                    labelWhenSage="Take Offer"
                  >
                    <Image
                      src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                      alt="Dexie"
                      width={16}
                      height={16}
                    />
                  </TakeOfferButton>
                  <a
                    href={`https://mintgarden.io/offers/${user.lastOfferId}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.miniBadge}
                    aria-label="View latest offer on Mintgarden"
                    title="Mintgarden"
                  >
                    <Image src="https://mintgarden.io/mint-logo-round.svg" alt="MintGarden" width={16} height={16} />
                    Mintgarden
                  </a>
                </div>
              )}
              {(!user.lastOfferId || user.lastOfferStatus !== 0) && (
                <div className={styles.badgeRow}>
                  <span className={`${styles.miniBadge} ${styles.warningBadge}`}>
                    {Number.isFinite(user?.rankQueuePosition) && (user.rankQueuePosition || 0) > 0
                      ? `Next mint in ~${formatEtaFromQueue(user.rankQueuePosition)}`
                      : 'Next Copy Coming Soon!'}
                  </span>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  )
}
