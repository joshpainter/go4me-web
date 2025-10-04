import Head from 'next/head'
import React from 'react'
import TimelineGrid from '../components/Timeline/TimelineGrid'
import { getSupabaseClient } from '../lib/database/supabaseClient'
import type { Database } from '../lib/database/database.types'
import styles from './Timeline.module.css'

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
        <title>Timeline</title>
        <meta name="description" content="Discover the latest Go4Snapps as they are created and traded." />
        <link rel="canonical" href="/timeline" />
        <meta property="og:title" content="Timeline" />
        <meta property="og:description" content="Discover the latest go4s as they are created and traded." />
      </Head>
      <div className={styles.timelinePage}>
        <main className={styles.timelineShell}>
          <header className={styles.timelineHeader}>
            <h1 className={styles.timelineTitle}>go4snapps</h1>
            <p className={styles.timelineSubtitle}>See the latest go4s as they drop!</p>
          </header>
          <TimelineGrid initial={initial} />
        </main>
      </div>
    </>
  )
}
