import Head from 'next/head'
import Link from 'next/link'
import Script from 'next/script'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Header, Segment, Container, Menu, Input, Icon } from 'semantic-ui-react'
import { useTheme } from './_app'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getSupabaseClient } from '../lib/supabaseClient'
import { TakeOfferButton } from '../components/wallet/TakeOfferButton'
import GlobalWalletBar from '../components/wallet/GlobalWalletBar'

const MOJO_PER_XCH = 1e12
// Special-case Marmot Recovery Fund XCH address
const MARMOT_BADGE_XCH = 'xch120ywvwahucfptkeuzzdpdz5v0nnarq5vgw94g247jd5vswkn7rls35y2gc'
// Simple formatting helpers
const formatXCH = (n) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(n);
const formatInt = (n) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n ?? 0);
const formatRelativeAgo = (ms) => {
  if (!ms) return '—'
  const diff = Date.now() - ms
  if (diff < 0) return 'just now'
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s} second${s === 1 ? '' : 's'} ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`
  const y = Math.floor(mo / 12)
  return `${y} year${y === 1 ? '' : 's'} ago`
}
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

// Format minutes as minutes, or hours + minutes if >= 60
const formatEtaMinutes = (mins) => {
  const m = Math.max(0, Math.round(mins || 0))
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const r = m % 60
    return r ? `${h}h ${r}m` : `${h}h`
  }
  return `${m} minute${m === 1 ? '' : 's'}`
}

// Card image with flip interaction: front = new PFP (avatarUrl), back = original (xPfpUrl) in a circle mask
function PfpFlipCard({ user, rootHostForLinks, idx }) {
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
        style={{ bottom: 8, right: 8, zIndex: 5, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 0, lineHeight: 1, backgroundColor: 'var(--badge-bg-solid)', color: 'var(--badge-fg-solid)', top: 'auto', left: 'auto' }}
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
                  <Image
                    src={user.avatarUrl}
                    alt={commonAlt}
                    fill
                    sizes="(max-width: 640px) 150px, 200px"
                    style={{ objectFit: 'cover' }}
                    priority={idx < 4}
                    fetchPriority={idx < 4 ? 'high' : 'auto'}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
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
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                />
              </div>
            )}
          </div>

          {/* Back: Original PFP in a circle mask */}
          <div style={backStyle}>
            {profileHref ? (
              <a href={profileHref} aria-label={`Open ${user.username}.go4.me`} style={{ position: 'absolute', inset: 0 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '80%', height: '80%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                  <Image src={user.xPfpUrl || user.avatarUrl} alt={commonAlt} fill sizes="180px" style={{ objectFit: 'cover' }} priority={idx < 4} />
                </div>
              </a>
            ) : (
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '80%', height: '80%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                <Image src={user.xPfpUrl || user.avatarUrl} alt={commonAlt} fill sizes="180px" style={{ objectFit: 'cover' }} priority={idx < 4} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  const startTime = Date.now()

  context.res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=600'
  );

  // Add performance headers
  context.res.setHeader('Server-Timing', `ssr;dur=${Date.now() - startTime}`);

  // Add resource hints for LCP optimization
  context.res.setHeader('Link', [
    '</fonts/Inter-VariableFont_slnt,wght.ttf>; rel=preload; as=font; type=font/ttf; crossorigin',
    '<https://wsrdqcvzoshyjvtfsjjp.supabase.co>; rel=preconnect',
    '<https://can.seedsn.app>; rel=preconnect'
  ].join(', '));

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
      badgeScore: { column: 'rank_total_badge_score', ascending: true },
      recentTrades: { column: 'rank_last_sale', ascending: true },
      rarest: { column: 'rank_fewest_copies_sold', ascending: true },
      marmotRecovery: { column: 'rank_copies_sold', ascending: true }
    }
    if (currentView === 'queue') {
      let qb = supabase
        .from('get_ungenerated_nfts')
        .select('*')
        .order('rank_queue_position', { ascending: true })
        .range(0, PAGE_SIZE - 1)
      if (q) {
        qb = qb.or(`username.ilike.%${q}%,name.ilike.%${q}%`)
      }
      const resp = await qb
      data = resp.data
      error = resp.error
    } else {
      const orderSpec = orderMap[currentView] || orderMap.totalSold
      if (currentView === 'marmotRecovery') {
        // Resolve author_ids that have the Marmot XCH address, then filter leaderboard by those ids
        const idsResp = await supabase
          .from('x_users')
          .select('author_id')
          .eq('xch_address', MARMOT_BADGE_XCH)
          .range(0, 9999)
        if (idsResp.error) {
          data = []
          error = idsResp.error
        } else {
          const ids = (idsResp.data || []).map(r => r.author_id).filter(Boolean)
          if (ids.length === 0) {
            data = []
            error = null
          } else {
            let qb = supabase
              .from('get_leaderboard')
              .select('*')
              .in('author_id', ids)
              .order(orderSpec.column, { ascending: orderSpec.ascending })
              .range(0, PAGE_SIZE - 1)
            if (q) qb = qb.or(`username.ilike.%${q}%,name.ilike.%${q}%`)
            const resp = await qb
            data = resp.data
            error = resp.error
          }
        }
      } else {
        let qb = supabase
          .from('get_leaderboard')
          .select('*')
          .order(orderSpec.column, { ascending: orderSpec.ascending })
          .range(0, PAGE_SIZE - 1)
        if (q) {
          qb = qb.or(`username.ilike.%${q}%,name.ilike.%${q}%`)
        }
        const resp = await qb
        data = resp.data
        error = resp.error
      }
    }

    if (error) throw error


    users = (data || []).map(row => {
      if (currentView === 'queue') {
        return {
          id: row.author_id || row.username,
          username: row.username,
          fullName: row.full_name || row.name,
          avatarUrl: row.pfp_ipfs_cid && row.username ? ('https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-go4me.png') : '',
          xPfpUrl: row.pfp_ipfs_cid && row.username ? ('https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-x.png') : '',
          lastNftSeriesNumber: row.last_nft_series_number ?? 0,
          rankQueuePosition: row.rank_queue_position ?? 0,
          _search: ((row.username || '') + ' ' + (row.full_name || row.name || '')).toLowerCase(),
        }
      }
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
  lastOfferStatus: row.last_offer_status,
  lastSaleAtMs: row.last_sale_at ? new Date(row.last_sale_at).getTime() : null,
        rankCopiesSold: row.rank_copies_sold,
        rankFewestCopiesSold: row.rank_fewest_copies_sold,
        rankTotalTradedValue: row.rank_total_traded_value,
  rankLastSale: row.rank_last_sale,
  rankTotalBadgeScore: row.rank_total_badge_score,
  // Expose queue minutes if present on this view so we can show ETA on Coming Soon badges
  rankQueuePosition: row.rank_queue_position ?? null,
  totalBadgeScore: row.total_badge_score || 0,
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
          badgeScore: { column: 'rank_total_badge_score', ascending: true },
          recentTrades: { column: 'rank_last_sale', ascending: true },
          rarest: { column: 'rank_fewest_copies_sold', ascending: true },
          marmotRecovery: { column: 'rank_copies_sold', ascending: true }
        }
        let data, error
        if (view === 'queue') {
          let qb = supabase
            .from('get_ungenerated_nfts')
            .select('*')
            .order('rank_queue_position', { ascending: true })
            .range(0, PAGE_SIZE - 1)
          if (query) qb = qb.or(`username.ilike.%${query}%,name.ilike.%${query}%`)
          const resp = await qb
          data = resp.data; error = resp.error
        } else if (view === 'marmotRecovery') {
          const idsResp = await supabase
            .from('x_users')
            .select('author_id')
            .eq('xch_address', MARMOT_BADGE_XCH)
            .range(0, 9999)
          if (idsResp.error) { data = []; error = idsResp.error }
          else {
            const ids = (idsResp.data || []).map(r => r.author_id).filter(Boolean)
            if (ids.length === 0) { data = []; error = null }
            else {
              const orderSpec = orderMap[view] || orderMap.totalSold
              let qb = supabase
                .from('get_leaderboard')
                .select('*')
                .in('author_id', ids)
                .order(orderSpec.column, { ascending: orderSpec.ascending })
                .range(0, PAGE_SIZE - 1)
              if (query) qb = qb.or(`username.ilike.%${query}%,name.ilike.%${query}%`)
              const resp = await qb
              data = resp.data; error = resp.error
            }
          }
        } else {
          const orderSpec = orderMap[view] || orderMap.totalSold
          let qb = supabase
            .from('get_leaderboard')
            .select('*')
            .order(orderSpec.column, { ascending: orderSpec.ascending })
            .range(0, PAGE_SIZE - 1)
          if (query) qb = qb.or(`username.ilike.%${query}%,name.ilike.%${query}%`)
          const resp = await qb
          data = resp.data; error = resp.error
        }
        if (error) throw error
        if (isCancelled) return
        const mapped = (data || []).map(row => {
          if (view === 'queue') {
            return {
              id: row.author_id || row.username,
              username: row.username,
              fullName: row.full_name || row.name,
              avatarUrl: row.pfp_ipfs_cid && row.username ? ('https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-go4me.png') : '',
              xPfpUrl: row.pfp_ipfs_cid && row.username ? ('https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-x.png') : '',
              lastNftSeriesNumber: row.last_nft_series_number ?? 0,
              rankQueuePosition: row.rank_queue_position ?? 0,
              _search: ((row.username || '') + ' ' + (row.full_name || row.name || '')).toLowerCase(),
            }
          }
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
            lastOfferStatus: row.last_offer_status,
            lastSaleAtMs: row.last_sale_at ? new Date(row.last_sale_at).getTime() : null,
            rankCopiesSold: row.rank_copies_sold,
            rankFewestCopiesSold: row.rank_fewest_copies_sold,
            rankTotalTradedValue: row.rank_total_traded_value,
            rankLastSale: row.rank_last_sale,
            rankTotalBadgeScore: row.rank_total_badge_score,
            rankQueuePosition: row.rank_queue_position ?? null,
            totalBadgeScore: row.total_badge_score || 0,
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
        badgeScore: { column: 'rank_total_badge_score', ascending: true },
        recentTrades: { column: 'rank_last_sale', ascending: true },
        rarest: { column: 'rank_fewest_copies_sold', ascending: true },
        marmotRecovery: { column: 'total_sold', ascending: false }
      }
      let data, error
      if (view === 'queue') {
        let qb = supabase
          .from('get_ungenerated_nfts')
          .select('*')
          .order('rank_queue_position', { ascending: true })
          .range(from, to)
  if (query) qb = qb.or(`username.ilike.%${query}%,name.ilike.%${query}%`)
        const resp = await qb
        data = resp.data; error = resp.error
      } else if (view === 'marmotRecovery') {
        const idsResp = await supabase
          .from('x_users')
          .select('author_id')
          .eq('xch_address', MARMOT_BADGE_XCH)
          .range(0, 9999)
        if (idsResp.error) { data = []; error = idsResp.error }
        else {
          const ids = (idsResp.data || []).map(r => r.author_id).filter(Boolean)
          if (ids.length === 0) { data = []; error = null }
          else {
            const orderSpec = orderMap[view] || orderMap.totalSold
            let qb = supabase
              .from('get_leaderboard')
              .select('*')
              .in('author_id', ids)
              .order(orderSpec.column, { ascending: orderSpec.ascending })
              .range(from, to)
            if (query) qb = qb.or(`username.ilike.%${query}%,name.ilike.%${query}%`)
            const resp = await qb
            data = resp.data; error = resp.error
          }
        }
      } else {
        const orderSpec = orderMap[view] || orderMap.totalSold
        let qb = supabase
          .from('get_leaderboard')
          .select('*')
          .order(orderSpec.column, { ascending: orderSpec.ascending })
          .range(from, to)
  if (query) qb = qb.or(`username.ilike.%${query}%,name.ilike.%${query}%`)
        const resp = await qb
        data = resp.data; error = resp.error
      }
      if (error) throw error
      const mapped = (data || []).map(row => {
        if (view === 'queue') {
          return {
            id: row.author_id || row.username,
            username: row.username,
            fullName: row.full_name || row.name,
            avatarUrl: row.pfp_ipfs_cid && row.username ? ('https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-go4me.png') : '',
            xPfpUrl: row.pfp_ipfs_cid && row.username ? ('https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-x.png') : '',
            lastNftSeriesNumber: row.last_nft_series_number ?? 0,
            rankQueuePosition: row.rank_queue_position ?? 0,
            _search: ((row.username || '') + ' ' + (row.full_name || row.name || '')).toLowerCase(),
          }
        }
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
          lastOfferStatus: row.last_offer_status,
          lastSaleAtMs: row.last_sale_at ? new Date(row.last_sale_at).getTime() : null,
          rankCopiesSold: row.rank_copies_sold,
          rankTotalTradedValue: row.rank_total_traded_value,
          rankFewestCopiesSold: row.rank_fewest_copies_sold,
          rankLastSale: row.rank_last_sale,
          rankTotalBadgeScore: row.rank_total_badge_score,
          rankQueuePosition: row.rank_queue_position ?? null,
          totalBadgeScore: row.total_badge_score || 0,
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
  if (view === 'queue') arr.sort((a, b) => (a.rankQueuePosition || 0) - (b.rankQueuePosition || 0))
  else if (view === 'totalTraded') arr.sort((a, b) => (a.rankTotalTradedValue || 0) - (b.rankTotalTradedValue || 0))
  else if (view === 'rarest') arr.sort((a, b) => (a.rankFewestCopiesSold || 0) - (b.rankFewestCopiesSold || 0))
  else if (view === 'badgeScore') arr.sort((a, b) => (a.rankTotalBadgeScore || 0) - (b.rankTotalBadgeScore || 0))
  else if (view === 'recentTrades') arr.sort((a, b) => (a.rankLastSale || 0) - (b.rankLastSale || 0))
  else arr.sort((a, b) => (a.rankCopiesSold || 0) - (b.rankCopiesSold || 0))
    return arr
  }, [loadedUsers, view])


  const { theme, toggleTheme } = useTheme()


  return (
    <div className={styles.container}>
      <Head>
        <title>go4.me</title>
        <link rel="icon" href="/collection-icon.png" />

        {/* Critical resource hints for LCP optimization */}
        <link rel="preload" href="/fonts/Inter-VariableFont_slnt,wght.ttf" as="font" type="font/ttf" crossOrigin="" />
        <link rel="preconnect" href="https://wsrdqcvzoshyjvtfsjjp.supabase.co" />
        <link rel="preconnect" href="https://can.seedsn.app" />


      </Head>
      <Script
        id="x-widgets"
        strategy="lazyOnload"
        src="https://platform.twitter.com/widgets.js"
      />

      {/* Sticky top bar (matches domain page style) */}
      <div className={styles.stickyTopbar}>
        {/* Left: gopher logo (no back link on home) */}
        <div className={styles.topNavLink} aria-label="go4.me">
          <Image src="/collection-icon.png" alt="go4.me" width={40} height={40} />
        </div>
        {/* Middle: search input */}
  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Input
            icon='search'
            size='large'
            placeholder='Search for go4s…'
            value={rawSearch}
            onChange={(_, { value }) => setRawSearch(value)}
            style={{ width: '100%', maxWidth: 'min(95vw, 2100px)' }}
          />
        </div>
        {/* Right: actions (wallet + theme toggle) */}
        <div className={styles.topNavActions}>
          <GlobalWalletBar inline />
          <button
            type='button'
            onClick={toggleTheme}
            aria-label='Toggle dark mode'
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className={styles.desktopThemeButton}
            style={{
              height: 34,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              color: 'var(--color-text)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 8px',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </div>

  <Container textAlign='center' style={{ paddingTop: 84, paddingBottom: 10 }}>
        <div style={{ width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Image
            src="/collection-icon.png"
            alt="go4.me collection icon"
            width={180}
            height={180}
            style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.35))' }}
            priority
          />
        </div>
  <div id='how-it-works' className={styles.claimText} style={{ marginTop: 14, color: '#666' }}>
          Claim your free, custom go4.me PFP and earn royalties whenever others purchase it!<br /> Simply share your XCH address and tag <a href='https://x.com/go4mebot' target='_blank' rel='noreferrer'>@go4mebot</a> on X to kick things off!
        </div>
        <div className={styles.desktopCtaButtons} style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a
            href={`https://x.com/intent/tweet?text=Hi @go4mebot! My XCH address is: `}
            target='_blank'
            rel='noreferrer'
            className={styles.ctaButton}
            aria-label='Claim your go4me PFP on X'
            title='Claim your go4me PFP on X'
          >
            Claim your free #1 go4me PFP on <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, fontSize: 18, fontWeight: 800}}>𝕏</span>
          </a>
          <Link
            href="/how-it-works"
            className={`${styles.ctaButton} ${styles.ctaButtonLight}`}
            aria-label='How does it work?'
            title='How does it work?'
          >
            How does it work?
          </Link>
        </div>
      </Container>

  {/* Search input moved to sticky top bar */}

      <Container style={{ marginTop: 30 }}>
        {/* Desktop Menu */}
        <Menu secondary pointing className={styles.desktopTabMenu}>
          <Menu.Item
            name='Total Editions Sold'
            active={view === 'totalSold'}
            onClick={() => setView('totalSold')}
          />
          <Menu.Item
            name='Total Traded Value'
            active={view === 'totalTraded'}
            onClick={() => setView('totalTraded')}
          />
          <Menu.Item
            name='Badge Score'
            active={view === 'badgeScore'}
            onClick={() => setView('badgeScore')}
          />
          <Menu.Item
            name='rarest'
            content='Rarest go4s'
            active={view === 'rarest'}
            onClick={() => setView('rarest')}
          />
          <Menu.Item
            name='Recent Trades'
            active={view === 'recentTrades'}
            onClick={() => setView('recentTrades')}
          />
          <Menu.Item
            name='Marmot Recovery Fund'
            active={view === 'marmotRecovery'}
            onClick={() => setView('marmotRecovery')}
            as='div'
          >
            <span>Marmot Recovery Fund</span>
            <Link
              href="/how-it-works#marmot-badge"
              onClick={(e) => e.stopPropagation()}
              aria-label="What is the Marmot Recovery Fund?"
              title="About the Marmot Recovery Fund"
              style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: '18px',
                  backgroundColor: 'var(--badge-bg-solid)',
                  color: 'var(--badge-fg-solid)',
                  border: '1px solid var(--color-border)'
                }}
              >
                ?
              </span>
            </Link>
          </Menu.Item>
          <Menu.Item
            name='Queue'
            active={view === 'queue'}
            onClick={() => setView('queue')}
          />
        </Menu>

        {/* Mobile Dropdown */}
        <div className={styles.mobileTabSelector}>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className={styles.mobileTabDropdown}
          >
            <option value="totalSold">Total Editions Sold</option>
            <option value="totalTraded">Total Traded Value</option>
            <option value="badgeScore">Badge Score</option>
            <option value="rarest">Rarest go4s</option>
            <option value="recentTrades">Recent Trades</option>
            <option value="marmotRecovery">Marmot Recovery Fund</option>
            <option value="queue">Queue</option>
          </select>
        </div>

        <Segment basic style={{ padding: 0 }}>
          <div className={styles.lbGrid}>
            {renderList.map((u, idx) => (
              <div key={u.id} className={styles.lbCard}>
                <div className={styles.rankBadge} style={{ backgroundColor: 'var(--badge-bg-solid)', color: 'var(--badge-fg-solid)' }}>#{
                  view === 'queue' ? (u.rankQueuePosition || idx + 1)
                    : view === 'totalTraded' ? (u.rankTotalTradedValue || u.rankCopiesSold || idx + 1)
                    : view === 'badgeScore' ? (u.rankTotalBadgeScore || idx + 1)
                    : view === 'recentTrades' ? (u.rankLastSale || idx + 1)
                    : view === 'rarest' ? (u.rankFewestCopiesSold || idx + 1)
                    : (u.rankCopiesSold || idx + 1)
                }</div>
                <PfpFlipCard user={u} rootHostForLinks={rootHostForLinks} idx={idx} />
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
                  {(view === 'totalSold' || view === 'rarest' || view === 'marmotRecovery') && (
                    <>
                      <div className={styles.badgeRow}>
                        <span className={styles.miniBadge} title='Total sold'>Sold {u.totalSold}</span>
                        <span className={styles.miniBadge} title='XCH total sold'>{formatXCH(u.totalTradedXCH)} XCH</span>
                      </div>
                      <div className={styles.badgeRow}>
                        <span className={styles.miniBadge} title='Royalties'>Royalties {formatXCH(u.totalRoyaltiesXCH ?? (u.totalTradedXCH * 0.10))} XCH</span>
                      </div>
                      <div className={styles.badgeRow}>
                        {u.lastOfferId && u.lastOfferStatus === 0 ? (
                          <>
                            <TakeOfferButton
                              offerId={u.lastOfferId}
                              className={styles.miniBadge}
                              ariaLabel='Take offer via WalletConnect'
                              title='Buy with WalletConnect'
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
                              href={`https://mintgarden.io/offers/${u.lastOfferId}`}
                              target='_blank'
                              rel='noreferrer noopener'
                              className={styles.miniBadge}
                              aria-label='View latest offer on Mintgarden'
                              title='Mintgarden'
                            >
                              <Image
                                src="https://mintgarden.io/mint-logo-round.svg"
                                alt="MintGarden"
                                width={16}
                                height={16}
                              />
                              Mintgarden
                            </a>
                          </>
                        ) : (
                          <span className={`${styles.miniBadge} ${styles.warningBadge}`}>
                            {Number.isFinite(u?.rankQueuePosition) && (u.rankQueuePosition ?? 0) > 0
                              ? `Next mint in ~${formatEtaMinutes(u.rankQueuePosition)}`
                              : 'Next Copy Coming Soon!'}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {view === 'totalTraded' && (
                    <>
                      <div className={styles.badgeRow}>
                        <span className={styles.miniBadge} title='XCH total sold'>{formatXCH(u.totalTradedXCH)} XCH</span>
                        <span className={styles.miniBadge} title='Total sold'>Sold {u.totalSold}</span>
                      </div>
                      <div className={styles.badgeRow}>
                        <span className={styles.miniBadge} title='Royalties'>Royalties {formatXCH(u.totalRoyaltiesXCH ?? (u.totalTradedXCH * 0.10))} XCH</span>
                      </div>
                      <div className={styles.badgeRow}>
                        {u.lastOfferId && u.lastOfferStatus === 0 ? (
                          <>
                            <TakeOfferButton
                              offerId={u.lastOfferId}
                              className={styles.miniBadge}
                              ariaLabel='Take offer via WalletConnect'
                              title='Buy with WalletConnect'
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
                              href={`https://mintgarden.io/offers/${u.lastOfferId}`}
                              target='_blank'
                              rel='noreferrer noopener'
                              className={styles.miniBadge}
                              aria-label='View latest offer on Mintgarden'
                              title='Mintgarden'
                            >
                              <Image
                                src="https://mintgarden.io/mint-logo-round.svg"
                                alt="MintGarden"
                                width={16}
                                height={16}
                              />
                              Mintgarden
                            </a>
                          </>
                        ) : (
                          <span className={`${styles.miniBadge} ${styles.warningBadge}`}>
                            {Number.isFinite(u?.rankQueuePosition) && (u.rankQueuePosition ?? 0) > 0
                              ? `Next mint in ~${formatEtaMinutes(u.rankQueuePosition)}`
                              : 'Next Copy Coming Soon!'}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {view === 'badgeScore' && (
                    <>
                      <div className={styles.badgeRow}>
                        <span className={styles.miniBadge} title='Score'>Score {formatInt(u.totalBadgeScore)}</span>
                      </div>
                    </>
                  )}
                  {view === 'queue' && (
                    <>
                      <div className={styles.badgeRow}>
                        <span className={styles.miniBadge} title='Next edition number'>
                          Next Edition #{(u.lastNftSeriesNumber ?? 0) + 1}
                        </span>
                        <span className={`${styles.miniBadge} ${styles.warningBadge}`} title='Estimated time to mint'>
                          Next mint in ~{formatEtaMinutes(u.rankQueuePosition ?? 0)}
                        </span>
                      </div>
                    </>
                  )}
                  {view === 'recentTrades' && u.lastSaleAtMs && (
                    <div className={styles.badgeRow}>
                      <span suppressHydrationWarning className={styles.miniBadge} title={new Date(u.lastSaleAtMs).toLocaleString()}>
                        Last sale {formatRelativeAgo(u.lastSaleAtMs)}
                      </span>
                    </div>
                  )}
                  {(view !== 'totalSold' && view !== 'totalTraded' && view !== 'rarest' && view !== 'queue' && view !== 'marmotRecovery') && (
                    <>
                      {u.lastOfferId && u.lastOfferStatus === 0 && (
                        <div className={styles.badgeRow}>
                          <TakeOfferButton
                            offerId={u.lastOfferId}
                            className={styles.miniBadge}
                            ariaLabel='Take offer via WalletConnect or view on Dexie'
                            title='Dexie'
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
                            href={`https://mintgarden.io/offers/${u.lastOfferId}`}
                            target='_blank'
                            rel='noreferrer noopener'
                            className={styles.miniBadge}
                            aria-label='View latest offer on Mintgarden'
                            title='Mintgarden'
                          >
                            <Image
                              src="https://mintgarden.io/mint-logo-round.svg"
                              alt="MintGarden"
                              width={16}
                              height={16}
                            />
                            Mintgarden
                          </a>
                        </div>
                      )}
                      {(!u.lastOfferId || u.lastOfferStatus !== 0) && (
                        <div className={styles.badgeRow}>
                          <span className={`${styles.miniBadge} ${styles.warningBadge}`}>
                            {Number.isFinite(u?.rankQueuePosition) && (u.rankQueuePosition ?? 0) > 0
                              ? `Next mint in ~${formatEtaMinutes(u.rankQueuePosition)}`
                              : 'Next Copy Coming Soon!'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {renderList.length === 0 && !isLoadingMore && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0', color: '#666' }}>
                {view === 'queue'
                  ? '🎉 Queue is empty! All NFTs have been generated.'
                  : 'No results.'}
              </div>
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
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              style={{
                background: isLoadingMore ? 'var(--color-border)' : 'var(--color-link)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: isLoadingMore ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isLoadingMore ? 0.6 : 1
              }}
            >
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
        {intersectionSupported && hasMore && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 8 }}>Scrolling loads more…</div>
        )}
        <div style={{ textAlign: 'center', margin: '2.5rem 0 1.5rem' }}>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            aria-label='Back to top'
            title='Back to top'
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              color: 'var(--color-text)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 12px',
              fontSize: '14px',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon name='arrow up' />
            Back to Top
          </button>
        </div>
        {/* Removed legacy filtered/rawQuery/deferredQuery indicators */}
      </Container>

      {/* Mobile Bottom Action Bar - only visible on mobile */}
      <div className={styles.mobileBottomBar}>
        <div className={styles.bottomBarContent}>
          <div className={styles.bottomBarRow}>
            {/* Claim button */}
            <a
              href={`https://x.com/intent/tweet?text=Hi @go4mebot! My XCH address is: `}
              target='_blank'
              rel='noreferrer'
              className={styles.mobileBottomClaimButton}
              aria-label='Claim your go4me PFP on X'
              title='Claim your go4me PFP on X'
            >
              Claim your Free PFP
            </a>

            {/* How it works button */}
            <Link
              href="/how-it-works"
              className={styles.mobileBottomHowButton}
              aria-label='How does it work?'
              title='How does it work?'
            >
              How it works
            </Link>


          </div>
        </div>
      </div>
    </div>
  )
}
