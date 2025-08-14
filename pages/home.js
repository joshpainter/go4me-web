import Head from 'next/head'
import Script from 'next/script'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Header, Segment, Container, Menu, Input, Button, Icon } from 'semantic-ui-react'
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

// Card image with flip interaction: front = new PFP (avatarUrl), back = original (xPfpUrl) in a circle mask
function PfpFlipCard({ user, rootHostForLinks }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const profileHref = user.username ? `//${user.username}.${(rootHostForLinks || 'go4.me')}/` : undefined
  const commonAlt = `${user.username || 'user'} avatar`

  const flipInnerStyle = {
    position: 'absolute',
    inset: 0,
    transformStyle: 'preserve-3d',
    transition: 'transform 360ms cubic-bezier(0.2, 0.7, 0.2, 1)',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
  }
  const faceStyle = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: 8,
    overflow: 'hidden'
  }
  const backStyle = {
    ...faceStyle,
    transform: 'rotateY(180deg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
    setIsTouch(!!touchCapable)
  }, [])

  return (
    <div
      className={styles.cardImgWrap}
      style={{ position: 'relative' }}
  onMouseEnter={() => { if (!isTouch) setIsFlipped(true) }}
  onMouseLeave={() => { if (!isTouch) setIsFlipped(false) }}
    >
      {/* Flip toggle button in upper-left, matching rank badge spacing/size */}

      <div
        title={isFlipped ? 'Show new PFP' : 'Show original PFP'}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsFlipped(v => !v) }}
        className={styles.rankBadge}
  style={{ top: 0, left: 0, right: 'auto', zIndex: 5, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 0, lineHeight: 1, backgroundColor: 'var(--badge-bg-solid)', color: 'var(--badge-fg-solid)' }}
      >
        <Icon name='refresh' style={{ margin: 0 }} />
      </div>

      {/* Flip container */}
      <div style={{ position: 'absolute', inset: 0, perspective: 900 }}>
        <div style={flipInnerStyle}>
          {/* Front: New PFP */}
          <div style={faceStyle}>
            {profileHref ? (
              <a href={profileHref} aria-label={`Open ${user.username}.go4.me`}>
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Image src={user.avatarUrl} alt={commonAlt} layout='fill' objectFit='cover' />
                </div>
              </a>
            ) : (
              <div style={{ position: 'absolute', inset: 0 }}>
                <Image src={user.avatarUrl} alt={commonAlt} layout='fill' objectFit='cover' />
              </div>
            )}
          </div>

          {/* Back: Original PFP in a circle mask */}
          <div style={backStyle}>
            {profileHref ? (
              <a href={profileHref} aria-label={`Open ${user.username}.go4.me`} style={{ position: 'absolute', inset: 0 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '80%', height: '80%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                  <Image src={user.xPfpUrl || user.avatarUrl} alt={commonAlt} layout='fill' objectFit='cover' />
                </div>
              </a>
            ) : (
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '80%', height: '80%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                <Image src={user.xPfpUrl || user.avatarUrl} alt={commonAlt} layout='fill' objectFit='cover' />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    'public, s-maxage=10, stale-while-revalidate=59'
  );

  // Derive root host (without subdomain) + preserve port so we can build username.<server> links dynamically
  const hostHeader = context.req?.headers?.host || ''
  const [hostNoPort, portPart] = hostHeader.split(':')
  let rootDomain = hostNoPort
  if (hostNoPort && hostNoPort !== 'localhost' && hostNoPort !== '127.0.0.1') {
    const parts = hostNoPort.split('.')
    if (parts.length >= 2) {
      rootDomain = parts.slice(-2).join('.') // use apex domain (e.g. go4.me)
    }
  } else if (hostNoPort === '127.0.0.1') {
    rootDomain = 'localhost'
  }
  const rootHostForLinks = portPart ? `${rootDomain}:${portPart}` : rootDomain

  let users = []
  try {
    const supabase = getSupabaseClient()

    // Prefer the materialized/SQL view get_leaderboard (new). Fallback to x_users if it errors.
    let data = null
    let error = null
    const PAGE_SIZE = 100
    const { view: viewParam, q: qParam } = context.query || {}
    const currentView = viewParam || 'totalSold'
    const q = (qParam || '').toString().trim()
    const orderMap = {
      totalSold: { column: 'rank_copies_sold', ascending: true },
      totalTraded: { column: 'rank_total_traded_value', ascending: true },
      recentTrades: { column: 'rank_last_sale', ascending: true }
    }
    const orderSpec = orderMap[currentView] || orderMap.totalSold

    let queryBuilder = supabase
      .from('get_leaderboard')
      .select('*')
      .order(orderSpec.column, { ascending: orderSpec.ascending })
      .range(0, PAGE_SIZE - 1)
    if (q) {
      // Server-side filtering on username or full name
      queryBuilder = queryBuilder.or(`username.ilike.%${q}%`, `full_name.ilike.%${q}%`)
    }
    const viewQuery = await queryBuilder

    data = viewQuery.data
    error = viewQuery.error

    if (error) throw error


    users = (data || []).map(row => {
      const totalSalesAmount = row.xch_total_sales_amount ?? 0
      const avgSalesAmount = row.xch_average_sales_amount ?? 0
      const avgTimeToSell = row.average_time_to_sell ?? 0
      const user = {
        // Use a stable unique id consistently across SSR + client pagination to avoid duplicates
        id: row.author_id,
        username: row.username,
        fullName: row.name,
        avatarUrl: 'https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-go4me.png',
        xPfpUrl: 'https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-x.png',
        totalSold: row.total_sold ?? 0,
        totalTradedXCH: totalSalesAmount / MOJO_PER_XCH,
        totalRoyaltiesXCH: (totalSalesAmount / MOJO_PER_XCH) * 0.10,
        averageSaleXCH: avgSalesAmount / MOJO_PER_XCH,
        avgTimeToSellMs: avgTimeToSell,
        lastOfferId: row.last_offerid,
        rankCopiesSold: row.rank_copies_sold,
        rankTotalTradedValue: row.rank_total_traded_value,
        rankLastSale: row.rank_last_sale,
        _search: ((row.username) + ' ' + (row.name)).toLowerCase(),
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
  return {
    props: { users, hasMore, initialView: (context.query.view || null), initialQuery: (context.query.q || ''), rootHostForLinks }
  }
}

export default function Home({ users = [], hasMore: initialHasMore = false, initialView, initialQuery, rootHostForLinks }) {
  const router = useRouter()
  const [view, setView] = useState(initialView || 'totalSold');
  const [rawSearch, setRawSearch] = useState(initialQuery || '');
  const [query, setQuery] = useState(initialQuery || ''); // debounced value used for server filtering
  const [loadedUsers, setLoadedUsers] = useState(() => users)
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

  const appendUsers = useCallback((more) => {
    setLoadedUsers(prev => {
      const existing = new Set(prev.map(u => u.id))
      const merged = [...prev]
      more.forEach(u => { if (!existing.has(u.id)) merged.push(u) })
      return merged
    })
  }, [])

  // Debounce search input -> query (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(rawSearch.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [rawSearch])

  // When view or debounced query changes: reset and fetch first page (client side to keep UX fast on tab switch)
  useEffect(() => {
    // Skip if this matches SSR initial load and we already have users
    const supabase = getSupabaseClient()
    if (!supabase) return
    let isCancelled = false
    const fetchFirst = async () => {
      setIsLoadingMore(true)
      try {
        const orderMap = {
          totalSold: { column: 'rank_copies_sold', ascending: true },
          totalTraded: { column: 'rank_total_traded_value', ascending: true },
          recentTrades: { column: 'rank_last_sale', ascending: true }
        }
        const orderSpec = orderMap[view] || orderMap.totalSold
        let qb = supabase
          .from('get_leaderboard')
          .select('*')
          .order(orderSpec.column, { ascending: orderSpec.ascending })
          .range(0, PAGE_SIZE - 1)
        if (query) {
          qb = qb.or(`username.ilike.%${query}%`, `full_name.ilike.%${query}%`)
        }
        const { data, error } = await qb
        if (error) throw error
        if (isCancelled) return
        const mapped = (data || []).map(row => {
          const totalSalesAmount = row.xch_total_sales_amount ?? row.total_traded_value ?? row.traded_xch ?? 0
          const avgSalesAmount = row.xch_average_sale_amount ?? row.xch_average_sales_amount ?? 0
          const avgTimeToSell = row.average_time_to_sell ?? 0
          const user = {
            id: row.author_id,
            username: row.username,
            fullName: row.name,
            avatarUrl: 'https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-go4me.png',
            xPfpUrl: 'https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-x.png',
            totalSold: row.total_sold ?? 0,
            totalTradedXCH: totalSalesAmount / MOJO_PER_XCH,
            totalRoyaltiesXCH: (totalSalesAmount / MOJO_PER_XCH) * 0.10,
            averageSaleXCH: avgSalesAmount / MOJO_PER_XCH,
            avgTimeToSellMs: avgTimeToSell,
            latestPrice: row.latest_price_xch ?? row.last_price ?? 0,
            lastOfferId: row.last_offerid,
            rankCopiesSold: row.rank_copies_sold,
            rankTotalTradedValue: row.rank_total_traded_value,
            rankLastSale: row.rank_last_sale,
            _search: ((row.username) + ' ' + (row.name)).toLowerCase(),
          }
          user.displayTotalTradedXCH = formatXCH(user.totalTradedXCH)
          user.displayTotalRoyaltiesXCH = formatXCH(user.totalRoyaltiesXCH)
          user.displayAverageSaleXCH = formatXCH(user.averageSaleXCH)
          user.displayAvgTime = formatDuration(user.avgTimeToSellMs)
          return user
        })
        setLoadedUsers(mapped)
        setHasMore((data || []).length === PAGE_SIZE)
        setPage(1)
      } catch (e) {
        console.error('Failed to refresh leaderboard', e)
        setLoadedUsers([])
        setHasMore(false)
      } finally {
        if (!isCancelled) setIsLoadingMore(false)
      }
    }
    fetchFirst()
    return () => { isCancelled = true }
  }, [view, query])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) return
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const orderMap = {
        totalSold: { column: 'total_sold', ascending: false },
        totalTraded: { column: 'total_traded_value', ascending: false },
        recentTrades: { column: 'rank_last_sale', ascending: true }
      }
      const orderSpec = orderMap[view] || orderMap.totalSold
      let qb = supabase
        .from('get_leaderboard')
        .select('*')
        .order(orderSpec.column, { ascending: orderSpec.ascending })
        .range(from, to)
      if (query) {
        qb = qb.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      }
      const { data, error } = await qb
      if (error) throw error
      const mapped = (data || []).map(row => {
        const totalSalesAmount = row.xch_total_sales_amount ?? row.total_traded_value ?? row.traded_xch ?? 0
        const avgSalesAmount = row.xch_average_sale_amount ?? row.xch_average_sales_amount ?? 0
        const avgTimeToSell = row.average_time_to_sell ?? 0
        const user = {
          // Maintain identical id derivation logic as SSR to prevent duplicate entries when merging pages
          id: row.author_id,
          username: row.username,
          fullName: row.name,
          avatarUrl: 'https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-go4me.png',
          xPfpUrl: 'https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-x.png',
          totalSold: row.total_sold ?? 0,
          totalTradedXCH: totalSalesAmount / MOJO_PER_XCH,
          totalRoyaltiesXCH: (totalSalesAmount / MOJO_PER_XCH) * 0.10,
          averageSaleXCH: avgSalesAmount / MOJO_PER_XCH,
          avgTimeToSellMs: avgTimeToSell,
          latestPrice: row.latest_price_xch ?? row.last_price ?? 0,
          lastOfferId: row.last_offerid,
          rankCopiesSold: row.rank_copies_sold,
          rankTotalTradedValue: row.rank_total_traded_value,
          rankLastSale: row.rank_last_sale,
          _search: ((row.username) + ' ' + (row.name)).toLowerCase(),
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
  }, [hasMore, isLoadingMore, page, query, appendUsers, view])

  // Determine feature support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('IntersectionObserver' in window)) setIntersectionSupported(false)
    }
  }, [])

  useEffect(() => {
    if (!hasMore) return
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
  }, [hasMore, loadMore, intersectionSupported])

  // Simple in-memory filtering and sorting each render (small data pages)
  const renderList = useMemo(() => {
    // Data already server-ordered; fallback sort if needed
    const arr = [...loadedUsers]
    if (view === 'totalTraded') arr.sort((a, b) => (a.rankTotalTradedValue || 0) - (b.rankTotalTradedValue || 0))
  else if (view === 'recentTrades') arr.sort((a, b) => (a.rankLastSale || 0) - (b.rankLastSale || 0))
    else arr.sort((a, b) => (a.rankCopiesSold || 0) - (b.rankCopiesSold || 0))
    return arr
  }, [loadedUsers, view])

  const { theme, toggleTheme } = useTheme()
  const shareUrl = useMemo(() => {
    const host = rootHostForLinks || ''
    const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1')
    return `${isLocal ? 'http' : 'https'}://${host}`
  }, [rootHostForLinks])

  return (
    <div className={styles.container}>
      <Head>
        <title>go4.me</title>
  <link rel="icon" href="/collection-icon.png" />
      </Head>
      <Script id="x-widgets" strategy="afterInteractive" src="https://platform.twitter.com/widgets.js" />

      {/* Sticky top bar (matches domain page style) */}
      <div className={styles.stickyTopbar}>
        {/* Left: gopher logo (no back link on home) */}
        <div className={styles.topNavLink} aria-label="go4.me">
          <Image src="/collection-icon.png" alt="go4.me" width={40} height={40} />
        </div>
        {/* Middle: search input */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Input
            icon='search'
            size='large'
            placeholder='Search by username or name…'
            value={rawSearch}
            onChange={(e, { value }) => setRawSearch(value)}
            style={{ width: '100%', maxWidth: 520 }}
          />
        </div>
        {/* Right: actions (theme toggle) */}
        <div className={styles.topNavActions}>
          <Button
            type='button'
            onClick={toggleTheme}
            basic
            color='grey'
            size='small'
            aria-label='Toggle dark mode'
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            icon
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </Button>
        </div>
      </div>

      <Container textAlign='center' style={{ paddingTop: 20, paddingBottom: 10 }}>
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', position: 'relative', marginBottom: 120 }}>
          {/* Banner Image using Next.js Image */}
          <div style={{ borderRadius: 8, overflow: 'hidden' }}>
            <Image
              src="/collection-banner.png"
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
              src="/collection-icon.png"
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
        <div style={{ marginTop: 12 }}>
          <Button
            as='a'
            href={`https://x.com/intent/tweet?text=Hi @go4mebot! My XCH address is: `}
            target='_blank'
            rel='noreferrer'
            size='large'
            basic
            color='grey'
            aria-label='Claim your go4me PFP on X'
            title='Claim your go4me PFP on X'
          >
            <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, fontSize: 18, lineHeight: 1, fontWeight: 800, marginRight: 8 }}>𝕏</span>
            Claim your free go4me PFP on X!
          </Button>
        </div>
      </Container>

  {/* Search input moved to sticky top bar */}

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
          <Menu.Item
            name='Recent Trades'
            active={view === 'recentTrades'}
            onClick={() => setView('recentTrades')}
          />
        </Menu>

        <Segment basic style={{ padding: 0 }}>
          <div className={styles.lbGrid}>
            {renderList.map((u, idx) => (
              <div key={u.id} className={styles.lbCard}>
                <div className={styles.rankBadge} style={{ right: 8, left: 'auto', backgroundColor: 'var(--badge-bg-solid)', color: 'var(--badge-fg-solid)' }}>#{
                  view === 'totalTraded' ? (u.rankTotalTradedValue || u.rankCopiesSold || idx + 1)
                    : view === 'recentTrades' ? (u.rankLastSale || idx + 1)
                      : (u.rankCopiesSold || idx + 1)
                }</div>
                <PfpFlipCard user={u} rootHostForLinks={rootHostForLinks} />
                <div className={styles.cardBody}>
      {u.username ? (
                    <div className={styles.username}>
                      <a
        href={`//${u.username}.${(rootHostForLinks || 'go4.me')}/`}
        style={{ color: 'inherit', textDecoration: 'none' }}
    aria-label={`Open ${u.username}.${(rootHostForLinks || 'go4.me')}`}
                      >
                        @{u.username}
                      </a>
                    </div>
                  ) : (
                    <div className={styles.username}>@{u.username}</div>
                  )}
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
        {!intersectionSupported && hasMore && (
          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <Button onClick={loadMore} loading={isLoadingMore} disabled={isLoadingMore} primary>Load more</Button>
          </div>
        )}
        {intersectionSupported && hasMore && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 8 }}>Scrolling loads more…</div>
        )}
        <div style={{ textAlign: 'center', margin: '2.5rem 0 1.5rem' }}>
          <Button
            size='small'
            basic
            icon
            labelPosition='left'
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            aria-label='Back to top'
            title='Back to top'
          >
            <Icon name='arrow up' />
            Back to Top
          </Button>
        </div>
        {/* Removed legacy filtered/rawQuery/deferredQuery indicators */}
      </Container>
    </div>
  )
}
