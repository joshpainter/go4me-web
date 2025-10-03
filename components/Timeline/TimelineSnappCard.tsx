import React from 'react'
import Image from 'next/image'
import { snappImageUrls } from '../../lib/database/services/timeline'

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
  created_at?: string | null
  last_offer_created_at?: string | null
  author_id?: string | null
}

export default function TimelineSnappCard(props: TimelineSnappCardProps) {
  const { ipfs_cid, title, created_at, last_offer_created_at } = props
  const [flipped, setFlipped] = React.useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const [generatedLoaded, setGeneratedLoaded] = React.useState(false)
  const [sourceLoaded, setSourceLoaded] = React.useState(false)

  const { generated, source } = snappImageUrls(ipfs_cid)
  const slugifiedTitle = (title ?? 'go4snapp')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const generatedDownloadName = `${slugifiedTitle || 'go4snapp'}-generated.png`
  const sourceDownloadName = `${slugifiedTitle || 'go4snapp'}-source.png`

  const toggle = () => setFlipped((f) => !f)
  const showDate = last_offer_created_at ?? created_at ?? ''
  const formattedDate = showDate
    ? new Date(showDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : ''

  return (
    <article className="snapp-card" onMouseLeave={() => !reducedMotion && setFlipped(false)}>
      <div className="flip-wrap" onMouseEnter={() => !reducedMotion && setFlipped(true)}>
        <button
          type="button"
          className="flip-inner"
          aria-pressed={flipped}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggle()
            }
          }}
        >
          <div className="flip-face front">
            {generated && (
              <Image
                src={generated}
                alt={title ?? 'Generated Go4Snapp'}
                fill
                sizes="400px"
                onLoad={() => {
                  setGeneratedLoaded(true)
                }}
                style={{ objectFit: 'cover' }}
                priority={false}
                className={`snapp-image snapp-image--generated ${generatedLoaded ? 'visible' : ''}`}
              />
            )}
          </div>
          <div className="flip-face back">
            {source && (
              <Image
                src={source}
                alt={title ? `${title} (source)` : 'Source Go4Snapp'}
                fill
                sizes="400px"
                onLoad={() => {
                  setSourceLoaded(true)
                }}
                style={{ objectFit: 'contain' }}
                priority={false}
                className={`snapp-image snapp-image--source ${sourceLoaded ? 'visible' : ''}`}
              />
            )}
          </div>
        </button>
      </div>
      <div className="card-meta">
        <h3 className="card-title">{title ?? 'Go4Snapp'}</h3>
        {formattedDate && (
          <time className="card-date" dateTime={showDate} suppressHydrationWarning>
            {formattedDate}
          </time>
        )}
        <div className="card-actions">
          {source ? (
            <a
              className="card-action"
              href={source}
              download={sourceDownloadName}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download source
            </a>
          ) : (
            <button type="button" className="card-action card-action--disabled" disabled>
              Source unavailable
            </button>
          )}
          {generated ? (
            <a
              className="card-action"
              href={generated}
              download={generatedDownloadName}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download generated
            </a>
          ) : (
            <button type="button" className="card-action card-action--disabled" disabled>
              Generated unavailable
            </button>
          )}
        </div>
      </div>
      <style jsx>{`
        .snapp-card {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          border: 1px solid #2f3336;
          border-radius: 16px;
          overflow: hidden;
          background: #0f1419;
          color: #e7e9ea;
          box-shadow: 0 0 0 1px rgba(231, 233, 234, 0.02);
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }
        .snapp-card:hover {
          border-color: #1d9bf0;
          box-shadow: 0 8px 24px rgba(29, 155, 240, 0.12);
        }
        .flip-wrap {
          position: relative;
          width: 100%;
          max-width: 100%;
          height: 400px;
          perspective: 1200px;
          background: #050708;
        }
        .flip-inner {
          position: absolute;
          inset: 0;
          border: 0;
          padding: 0;
          background: transparent;
          transform-style: preserve-3d;
          transition: transform 320ms ease;
          cursor: pointer;
        }
        .flip-inner:focus-visible {
          outline: 2px solid #1d9bf0;
          outline-offset: 3px;
        }
        .flip-inner[aria-pressed='true'] {
          transform: rotateY(180deg);
        }
        @media (prefers-reduced-motion: reduce) {
          .flip-inner {
            transition: none;
          }
          .flip-inner[aria-pressed='true'] {
            transform: none;
          }
        }
        .flip-face {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
        }
        .front {
          transform: rotateY(0deg);
        }
        .back {
          transform: rotateY(180deg);
        }
        .snapp-image {
          transition: opacity 200ms ease;
          opacity: 0;
          object-position: center;
          background: #050708;
        }
        .snapp-image--generated {
        }
        .snapp-image--source {
        }
        .snapp-image.visible {
          opacity: 1;
        }
        .card-meta {
          padding: 16px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .card-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: inherit;
        }
        .card-date {
          font-size: 14px;
          color: #8b98a5;
        }
        .card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .card-action {
          border: 1px solid #2f3336;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 14px;
          font-weight: 600;
          background: transparent;
          color: #1d9bf0;
          cursor: pointer;
          text-decoration: none;
          transition:
            background-color 150ms ease,
            border-color 150ms ease,
            color 150ms ease;
        }
        .card-action:hover {
          border-color: #1d9bf0;
          background: rgba(29, 155, 240, 0.12);
        }
        .card-action--disabled,
        .card-action--disabled:hover {
          cursor: not-allowed;
          color: #8b98a5;
          border-color: #2f3336;
          background: transparent;
        }
      `}</style>
    </article>
  )
}
