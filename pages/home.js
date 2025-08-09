import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Header, Segment, Container, Menu, Input, Label, Button, Icon } from 'semantic-ui-react'
import { useTheme } from './_app'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getSupabaseClient } from '../lib/supabaseClient'

const MOJO_PER_XCH = 1e12
// Simple formatting helpers
const formatXCH = (n) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(n);
const formatDuration = (ms) => {
  if (!ms) return '—'
  const seconds = Math.floor(ms / 1000)
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    'public, s-maxage=10, stale-while-revalidate=59'
  );

  let users = []
  try {
    const supabase = getSupabaseClient()

    // Prefer the materialized/SQL view get_leaderboard (new). Fallback to x_users if it errors.
    let data = null
    let error = null
    const PAGE_SIZE = 100
    const viewQuery = await supabase
      .from('get_leaderboard')
      .select('*')
      .order('total_sold', { ascending: false })
      .range(0, PAGE_SIZE - 1)

    data = viewQuery.data
    error = viewQuery.error

    if (error) throw error


  users = (data || []).map(row => {
      const totalSalesAmount = row.xch_total_sales_amount ?? 0
      const avgSalesAmount = row.xch_average_sales_amount ?? 0
      const avgTimeToSell = row.average_time_to_sell ?? 0
      const user = {
    // Use a stable unique id consistently across SSR + client pagination to avoid duplicates
    id: row.author_id || row.id || row.user_id || row.username,
        username: row.username || '',
        fullName: row.full_name || '',
        avatarUrl: row.generated_pfp_url,
        totalSold: row.total_sold ?? 0,
        totalTradedXCH: totalSalesAmount / MOJO_PER_XCH,
        totalRoyaltiesXCH: (totalSalesAmount / MOJO_PER_XCH) * 0.10,
        averageSaleXCH: avgSalesAmount / MOJO_PER_XCH,
        avgTimeToSellMs: avgTimeToSell,
  lastOfferId: row.last_offerid,
        _search: ((row.username || '') + ' ' + (row.full_name || '')).toLowerCase(),
      }
      user.displayTotalTradedXCH = formatXCH(user.totalTradedXCH)
      user.displayTotalRoyaltiesXCH = formatXCH(user.totalRoyaltiesXCH)
      user.displayAverageSaleXCH = formatXCH(user.averageSaleXCH)
      user.displayAvgTime = formatDuration(user.avgTimeToSellMs)
      return user
    })
  } catch (e) {
    console.error('Failed to load users from Supabase', e)
  }

  const hasMore = users.length === 100
  const { view: viewParam, q: qParam } = context.query || {}
  return {
    props: { users, hasMore, initialView: viewParam || null, initialQuery: qParam || '' }
  }
}

export default function Home({ users = [], hasMore: initialHasMore = false, initialView, initialQuery }) {
  const router = useRouter()
  const [view, setView] = useState(initialView || 'totalSold');
  const [query, setQuery] = useState(initialQuery || '');
  const [loadedUsers, setLoadedUsers] = useState(users)
  const [page, setPage] = useState(1) // next page index (0 fetched server-side)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const PAGE_SIZE = 100
  const sentinelRef = useRef(null)
  const [intersectionSupported, setIntersectionSupported] = useState(true)

  useEffect(() => {
    const desiredQuery = {}
    if (view !== 'totalSold') desiredQuery.view = view
    if (query) desiredQuery.q = query
    const current = router.query || {}
    const same = (
      (desiredQuery.view || '') === (current.view || '') &&
      (desiredQuery.q || '') === (current.q || '')
    )
    if (!same) {
      router.replace({ pathname: router.pathname, query: desiredQuery }, undefined, { shallow: true })
    }
  }, [view, query, router])

  const appendUsers = (more) => {
    setLoadedUsers(prev => {
      const existing = new Set(prev.map(u => u.id))
      const merged = [...prev]
      more.forEach(u => { if (!existing.has(u.id)) merged.push(u) })
      return merged
    })
  }

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return
    if (query) return // don't load additional pages during active search
    setIsLoadingMore(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) return
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error } = await supabase
        .from('get_leaderboard')
        .select('*')
        .order('total_sold', { ascending: false })
        .range(from, to)
      if (error) throw error
    const mapped = (data || []).map(row => {
        const totalSalesAmount = row.xch_total_sales_amount ?? row.total_traded_value ?? row.traded_xch ?? 0
        const avgSalesAmount = row.xch_average_sale_amount ?? row.xch_average_sales_amount ?? 0
        const avgTimeToSell = row.average_time_to_sell ?? 0
        const user = {
      // Maintain identical id derivation logic as SSR to prevent duplicate entries when merging pages
      id: row.author_id || row.id || row.user_id || row.username,
          username: row.username || row.handle || 'unknown',
          fullName: row.full_name || row.name || '',
          avatarUrl: row.generated_pfp_url || row.avatar_url || '/templates/pfp0001.png',
          totalSold: row.total_sold ?? 0,
          totalTradedXCH: totalSalesAmount / MOJO_PER_XCH,
          totalRoyaltiesXCH: (totalSalesAmount / MOJO_PER_XCH) * 0.10,
          averageSaleXCH: avgSalesAmount / MOJO_PER_XCH,
          avgTimeToSellMs: avgTimeToSell,
          latestPrice: row.latest_price_xch ?? row.last_price ?? 0,
          lastOfferId: row.last_offerid,
          _search: ((row.username || row.handle || '') + ' ' + (row.full_name || row.name || '')).toLowerCase(),
        }
        user.displayTotalTradedXCH = formatXCH(user.totalTradedXCH)
        user.displayTotalRoyaltiesXCH = formatXCH(user.totalRoyaltiesXCH)
        user.displayAverageSaleXCH = formatXCH(user.averageSaleXCH)
        user.displayAvgTime = formatDuration(user.avgTimeToSellMs)
        return user
      })
      appendUsers(mapped)
      setPage(p => p + 1)
      setHasMore((data || []).length === PAGE_SIZE)
    } catch (e) {
      console.error('Failed to load more leaderboard rows', e)
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, page, query])

  // Determine feature support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('IntersectionObserver' in window)) setIntersectionSupported(false)
    }
  }, [])

  useEffect(() => {
    if (!hasMore) return
    if (query) return // pause infinite scroll while searching
    if (!intersectionSupported) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMore()
        }
      })
    }, { rootMargin: '300px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore, query, intersectionSupported])

  // Simple in-memory filtering and sorting each render (small data pages)
  const renderList = useMemo(() => {
    const arr = [...loadedUsers]
    if (view === 'avgTimeToSell') arr.sort((a, b) => a.avgTimeToSellMs - b.avgTimeToSellMs)
    else if (view === 'totalTraded') arr.sort((a, b) => b.totalTradedXCH - a.totalTradedXCH)
    else arr.sort((a, b) => b.totalSold - a.totalSold)
    const q = query.trim().toLowerCase()
    if (!q) return arr
    return arr.filter(u => u._search && u._search.includes(q))
  }, [loadedUsers, view, query])

  const { theme, toggleTheme } = useTheme()

  return (
    <div className={styles.container}>
      <Head>
        <title>go4.me</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container textAlign='center' style={{ paddingTop: 20, paddingBottom: 10 }}>
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', position: 'relative', marginBottom: 120 }}>
          {/* Banner Image using Next.js Image */}
          <div style={{ borderRadius: 8, overflow: 'hidden' }}>
            <Image
              src="https://go4.me/collection-banner.png"
              alt="go4.me collection banner"
              layout="responsive"
              width={900}
              height={300}
              priority
            />
          </div>
          {/* Center-bottom overlay icon (approx 1/3 overlapping the banner) */}
          <div style={{ position: 'absolute', left: '50%', bottom: -120, transform: 'translateX(-50%)' }}>
            <Image
              src="https://go4.me/collection-icon.png"
              alt="go4.me collection icon"
              width={180}
              height={180}
              style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.35))' }}
            />
          </div>
        </div>
        <div style={{ marginTop: 14, color: '#666', fontSize: 16 }}>
          Claim your free, custom go4.me PFP and earn royalties whenever others purchase it!<br /> Simply share your XCH address and tag <a href='https://x.com/go4mebot' target='_blank' rel='noreferrer'>@go4mebot</a> on X to kick things off!
        </div>
      </Container>

      <Container style={{ marginTop: 20, marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <Input
          icon='search'
          size='large'
          placeholder='Search by username or name…'
          value={query}
          onChange={(e, { value }) => setQuery(value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <Button
          type='button'
          onClick={toggleTheme}
          basic
          color='grey'
          style={{ flex: '0 0 auto', height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px' }}
          aria-label='Toggle dark mode'
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          icon
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </Button>
      </Container>

      <Container style={{ marginTop: 10 }}>
        <Menu secondary pointing>
          <Menu.Item
            name='Total sold'
            active={view === 'totalSold'}
            onClick={() => setView('totalSold')}
          />
          <Menu.Item
            name='Total traded value'
            active={view === 'totalTraded'}
            onClick={() => setView('totalTraded')}
          />
        </Menu>

        <Segment basic style={{ padding: 0 }}>
          <div className={styles.lbGrid}>
            {renderList.map((u, idx) => (
              <div key={u.id} className={styles.lbCard}>
                <div className={styles.rankBadge}>#{idx + 1}</div>
                <div className={styles.cardImgWrap}>
                  <Image src={u.avatarUrl} alt={`${u.username} avatar`} layout='fill' objectFit='cover' />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.username}>@{u.username}</div>
                  {u.fullName && <div className={styles.fullName}>{u.fullName}</div>}
                  <div className={styles.statsRow}>
                    <span title='Total sold'>Total Sold: {u.totalSold} ({formatXCH(u.totalTradedXCH)} XCH)</span>
                  </div>
                  <div className={styles.statsRowSmall}>
                    <span title='Royalties'>Total Royalties: {formatXCH(u.totalRoyaltiesXCH ?? (u.totalTradedXCH * 0.10))} XCH</span>
                  </div>
                  <div className={styles.statsRowSmall}>
                    <span title='Avg Sale Price'>Avg Sales Price: {formatXCH(u.averageSaleXCH)} XCH</span>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 8, textAlign: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    {u.lastOfferId && (
                      <>
                        <Button
                          as='a'
                          href={`https://dexie.space/offers/${u.lastOfferId}`}
                          target='_blank'
                          rel='noreferrer'
                          size='tiny'
                          basic
                          color='blue'
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
                          aria-label='Dexie'
                          title='Dexie'
                        >
                          <Image
                            src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                            alt="Dexie"
                            width={22}
                            height={22}
                          />
                          <Icon name='external' size='small' />
                        </Button>
                        <Button
                          as='a'
                          href={`https://mintgarden.io/offers/${u.lastOfferId}`}
                          target='_blank'
                          rel='noreferrer'
                          size='tiny'
                          basic
                          color='green'
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
                          aria-label='Mintgarden'
                          title='Mintgarden'
                        >
                          <Image
                            src="https://mintgarden.io/mint-logo-round.svg"
                            alt="MintGarden"
                            width={22}
                            height={22}
                          />
                          <Icon name='external' size='small' />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {renderList.length === 0 && !isLoadingMore && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0', color: '#666' }}>No results.</div>
            )}
            {isLoadingMore && !query && (
              [...Array(6)].map((_, i) => (
                <div key={`sk-${i}`} className={styles.lbSkeletonCard}>
                  <div className={`${styles.skeleton} ${styles.lbSkeletonImg}`} />
                  <div className={`${styles.skeleton} ${styles.lbSkeletonLine}`} style={{ width: '60%' }} />
                  <div className={`${styles.skeleton} ${styles.lbSkeletonLine}`} style={{ width: '40%' }} />
                  <div className={`${styles.skeleton} ${styles.lbSkeletonLine}`} style={{ width: '70%' }} />
                </div>
              ))
            )}
          </div>
        </Segment>
        <div ref={sentinelRef} />
        {!query && !intersectionSupported && hasMore && (
          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <Button onClick={loadMore} loading={isLoadingMore} disabled={isLoadingMore} primary>Load more</Button>
          </div>
        )}
        {!query && intersectionSupported && hasMore && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 8 }}>Scrolling loads more…</div>
        )}
        {/* Removed legacy filtered/rawQuery/deferredQuery indicators */}
      </Container>
    </div>
  )
}
