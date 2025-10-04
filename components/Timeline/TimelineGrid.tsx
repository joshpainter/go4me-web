import React from 'react'
import TimelineSnappCard from './TimelineSnappCard'
import { getTimelinePage, type TimelineSnappRow } from '../../lib/database/services/timeline'
import styles from './TimelineGrid.module.css'

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
    <div className={styles.timelineGrid}>
      <div className={styles.timelineGridItems}>
        {items.map((it) => (
          <TimelineSnappCard
            key={it.go4snapp_id ?? `${it.author_id}-${it.created_at}`}
            ipfs_cid={it.ipfs_cid ?? undefined}
            title={it.title}
            description={it.description ?? undefined}
            created_at={it.created_at ?? undefined}
            last_offer_created_at={it.last_offer_created_at ?? undefined}
            author_id={it.author_id ?? undefined}
            last_offer_id={it.last_offer_id ?? undefined}
            username={it.username ?? undefined}
            user_display_name={it.user_display_name ?? undefined}
            user_pfp_ipfs_cid={it.user_pfp_ipfs_cid ?? undefined}
            last_edition_number={it.last_edition_number ?? undefined}
          />
        ))}
      </div>
      <div className={styles.timelineGridActions}>
        <button type="button" onClick={loadMore} disabled={loading || done} className={styles.timelineGridButton}>
          {loading ? 'Loading…' : done ? 'No more' : 'Load more'}
        </button>
      </div>
      {error && <div className={styles.timelineGridError}>{error}</div>}
    </div>
  )
}
