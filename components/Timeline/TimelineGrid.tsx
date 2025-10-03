import React from 'react'
import TimelineSnappCard from './TimelineSnappCard'
import { getTimelinePage, type TimelineSnappRow } from '../../lib/database/services/timeline'

export default function TimelineGrid({ initial }: { initial: TimelineSnappRow[] }) {
  const [items, setItems] = React.useState<TimelineSnappRow[]>(initial)
  const [page, setPage] = React.useState(1) // initial already page 0
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  const loadMore = async () => {
    if (loading || done) return
    setLoading(true)
    setError(null)
    try {
      const next = await getTimelinePage({ page })
      if (!next.length) {
        setDone(true)
      } else {
        setItems((prev) => [...prev, ...next])
        setPage((p) => p + 1)
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load more'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="timeline-grid">
      <div className="timeline-grid__items">
        {items.map((it) => (
          <TimelineSnappCard
            key={it.go4snapp_id ?? `${it.author_id}-${it.created_at}`}
            ipfs_cid={it.ipfs_cid ?? undefined}
            title={it.title}
            created_at={it.created_at ?? undefined}
            last_offer_created_at={it.last_offer_created_at ?? undefined}
            author_id={it.author_id ?? undefined}
          />
        ))}
      </div>
      <div className="timeline-grid__actions">
        <button type="button" onClick={loadMore} disabled={loading || done} className="timeline-grid__button">
          {loading ? 'Loading…' : done ? 'No more' : 'Load more'}
        </button>
      </div>
      {error && <div className="timeline-grid__error">{error}</div>}
      <style jsx>{`
        .timeline-grid {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .timeline-grid__items {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          justify-items: center;
        }
        .timeline-grid__actions {
          display: flex;
          justify-content: center;
        }
        .timeline-grid__button {
          border: 1px solid #2f3336;
          background: transparent;
          color: #1d9bf0;
          border-radius: 999px;
          font-weight: 600;
          padding: 10px 28px;
          cursor: pointer;
          transition:
            background-color 150ms ease,
            color 150ms ease,
            border-color 150ms ease;
        }
        .timeline-grid__button:hover:not(:disabled) {
          background: rgba(29, 155, 240, 0.1);
          border-color: #1d9bf0;
        }
        .timeline-grid__button:disabled {
          cursor: not-allowed;
          color: #8b98a5;
          border-color: #2f3336;
        }
        .timeline-grid__error {
          text-align: center;
          color: #f4212e;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
