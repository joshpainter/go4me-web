import Head from 'next/head'
import React from 'react'
import TimelineGrid from '../components/Timeline/TimelineGrid'
import { getSupabaseClient } from '../lib/database/supabaseClient'
import type { Database } from '../lib/database/database.types'

export type TimelineSnappRow = Database['public']['Views']['get_timeline_go4snapps']['Row']

export async function getServerSideProps() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('get_timeline_go4snapps').select('*').range(0, 23)

  if (error) {
    // Render page without data; client can try load more
    return { props: { initial: [] as TimelineSnappRow[] } }
  }

  return { props: { initial: (data ?? []) as TimelineSnappRow[] } }
}

export default function TimelinePage({ initial }: { initial: TimelineSnappRow[] }) {
  return (
    <>
      <Head>
        <title>Timeline — New Go4s and Go4Snapps</title>
        <meta name="description" content="Discover the latest Go4Snapps as they are created and traded." />
        <link rel="canonical" href="/timeline" />
        <meta property="og:title" content="Timeline — New Go4s and Go4Snapps" />
        <meta property="og:description" content="Discover the latest Go4Snapps as they are created and traded." />
      </Head>
      <div className="timeline-page">
        <main className="timeline-shell">
          <header className="timeline-header">
            <h1 className="timeline-title">Timeline</h1>
            <p className="timeline-subtitle">See the latest Go4Snapps as they drop.</p>
          </header>
          <TimelineGrid initial={initial} />
        </main>
      </div>
      <style jsx>{`
        .timeline-page {
          min-height: 100vh;
          background: #0f1419;
          display: flex;
          justify-content: center;
        }
        .timeline-shell {
          width: 100%;
          max-width: 680px;
          padding: 0 16px 64px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .timeline-header {
          position: sticky;
          top: 0;
          z-index: 20;
          margin: 0 -16px;
          padding: 20px 16px 16px;
          background: rgba(15, 20, 25, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #2f3336;
        }
        .timeline-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #e7e9ea;
        }
        .timeline-subtitle {
          margin: 8px 0 0;
          font-size: 15px;
          color: #8b98a5;
        }
      `}</style>
      <style jsx global>{`
        body {
          background: #0f1419;
          color: #e7e9ea;
        }
      `}</style>
    </>
  )
}
