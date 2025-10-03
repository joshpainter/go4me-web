import Head from 'next/head'
import Link from 'next/link'
import Script from 'next/script'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Segment, Container, Menu, Input, Icon, type InputOnChangeData } from 'semantic-ui-react'
import { useTheme } from './_app'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import type { GetServerSideProps } from 'next'
import { fetchLeaderboardPage } from '../lib/database/services/leaderboard'
// import { TakeOfferButton } from '../components/wallet/TakeOfferButton'
import GlobalWalletBar from '../components/wallet/GlobalWalletBar'
import { OrganizationSchema, WebSiteSchema } from '../components/SEO/StructuredData'
import { SITE_CONFIG } from '../lib/constants'
import { LEADERBOARD_PAGE_SIZE } from '../lib/constants'
import type { Tables } from '../lib/database/database.types'
// Use Supabase-generated row shape for get_leaderboard
type LeaderboardRow = Tables<'get_leaderboard'>

// Types
type LeaderboardView =
  | 'totalSold'
  | 'totalTraded'
  | 'badgeScore'
  | 'shadowScore'
  | 'rarest'
  | 'recentTrades'
  | 'marmotRecovery'
  | 'queue'

import { mapLeaderboardRowToHomeUser, type HomeUser } from '../lib/database/services/mappers'
// Formatting moved into PfpCard; no direct usage here
import PfpCard from '../components/PfpCard'

const ALL_VIEWS: LeaderboardView[] = [
  'totalSold',
  'totalTraded',
  'badgeScore',
  'shadowScore',
  'rarest',
  'recentTrades',
  'marmotRecovery',
  'queue',
]
const isValidView = (v: unknown): v is LeaderboardView => typeof v === 'string' && (ALL_VIEWS as string[]).includes(v)

interface HomeProps {
  users: HomeUser[]
  hasMore: boolean
  initialView?: LeaderboardView | null
  initialQuery?: string
  rootHostForLinks?: string
}

// Card UI is now handled by components/PfpCard

export const getServerSideProps: GetServerSideProps<HomeProps> = async (context) => {
  const startTime = Date.now()

  context.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')

  // Add performance headers
  context.res.setHeader('Server-Timing', `ssr;dur=${Date.now() - startTime}`)

  // Add resource hints for LCP optimization
  context.res.setHeader(
    'Link',
    [
      '</fonts/Inter-VariableFont_slnt,wght.ttf>; rel=preload; as=font; type=font/ttf; crossorigin',
      '<https://wsrdqcvzoshyjvtfsjjp.supabase.co>; rel=preconnect',
      '<https://can.seedsn.app>; rel=preconnect',
    ].join(', '),
  )

  // Derive root host (without subdomain) + preserve port so we can build username.<server> links dynamically
  const hostHeader = (context.req?.headers?.host as string) || ''
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

  const PAGE_SIZE = LEADERBOARD_PAGE_SIZE
  let users: HomeUser[] = []
  try {
    const { view: viewParam, q: qParam } = context.query || {}
    const rawView = Array.isArray(viewParam) ? viewParam[0] : viewParam
    const currentView: LeaderboardView = isValidView(rawView) ? rawView : 'totalSold'
    const q = (qParam || '').toString().trim()

    const { data, error } = await fetchLeaderboardPage(currentView as string, q, { from: 0, to: PAGE_SIZE - 1 })
    if (error) throw new Error(error.message)

    users = (data || []).map((row: LeaderboardRow) => mapLeaderboardRowToHomeUser(row))
  } catch (e) {
    console.error('Failed to load users from Supabase', e)
  }

  const hasMore = users.length === PAGE_SIZE
  return {
    props: {
      users,
      hasMore,
      initialView: isValidView(Array.isArray(context.query.view) ? context.query.view[0] : context.query.view)
        ? ((Array.isArray(context.query.view) ? context.query.view[0] : context.query.view) as LeaderboardView)
        : null,
      initialQuery: Array.isArray(context.query.q) ? context.query.q[0] : context.query.q || '',
      rootHostForLinks,
    },
  }
}

export default function Home({
  users = [],
  hasMore: initialHasMore = false,
  initialView,
  initialQuery,
  rootHostForLinks,
}: HomeProps) {
  const router = useRouter()
  const [view, setView] = useState<LeaderboardView>(initialView || 'totalSold')
  const [rawSearch, setRawSearch] = useState(initialQuery || '')
  const [query, setQuery] = useState(initialQuery || '') // debounced value used for server filtering
  const [loadedUsers, setLoadedUsers] = useState<HomeUser[]>(() => users)
  const [page, setPage] = useState(1) // next page index (0 fetched server-side)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const PAGE_SIZE = LEADERBOARD_PAGE_SIZE
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [intersectionSupported, setIntersectionSupported] = useState(true)

  useEffect(() => {
    const desiredQuery: Record<string, string> = {}
    if (view !== 'totalSold') desiredQuery.view = view
    if (query) desiredQuery.q = query
    const current = (router.query as Record<string, string>) || {}
    const same = (desiredQuery.view || '') === (current.view || '') && (desiredQuery.q || '') === (current.q || '')
    if (!same) {
      router.replace({ pathname: router.pathname, query: desiredQuery }, undefined, { shallow: true })
    }
  }, [view, query, router])

  const appendUsers = useCallback((more: HomeUser[]) => {
    setLoadedUsers((prev) => {
      const existing = new Set(prev.map((u) => u.id))
      const merged = [...prev]
      more.forEach((u) => {
        if (!existing.has(u.id)) merged.push(u)
      })
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
    let isCancelled = false
    const fetchFirst = async () => {
      setIsLoadingMore(true)
      try {
        const { data, error } = await fetchLeaderboardPage(view, query, { from: 0, to: PAGE_SIZE - 1 })
        if (error) throw new Error(error.message)
        if (isCancelled) return
        const mapped = (data || []).map((row: LeaderboardRow) => mapLeaderboardRowToHomeUser(row))
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
    return () => {
      isCancelled = true
    }
  }, [view, query, PAGE_SIZE])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error } = await fetchLeaderboardPage(view as string, query, { from, to })
      if (error) throw new Error(error.message)

      const mapped = (data || []).map((row: LeaderboardRow) => mapLeaderboardRowToHomeUser(row))
      appendUsers(mapped)
      setPage((p) => p + 1)
      setHasMore((data || []).length === PAGE_SIZE)
    } catch (e) {
      console.error('Failed to load more leaderboard rows', e)
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, page, query, appendUsers, view, PAGE_SIZE])

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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore()
          }
        })
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore, intersectionSupported])

  // Use server-ordered list directly; no client-side fallback sorts
  const renderList = loadedUsers

  const { theme, toggleTheme } = useTheme()

  return (
    <div className={styles.container}>
      <Head>
        <title>{SITE_CONFIG.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={SITE_CONFIG.defaultMetaDescription} />
        <link rel="icon" href="/collection-icon.png" />
        <link rel="canonical" href={`${SITE_CONFIG.url}/`} />

        {/* Open Graph / Twitter Card Meta */}
        <meta property="og:site_name" content={SITE_CONFIG.name} />
        <meta property="og:url" content={`${SITE_CONFIG.url}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SITE_CONFIG.name} />
        <meta property="og:description" content={SITE_CONFIG.defaultMetaDescription} />
        <meta property="og:image" content={SITE_CONFIG.banner} />
        <meta property="og:image:alt" content={`${SITE_CONFIG.name} NFT leaderboard`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_CONFIG.name} />
        <meta name="twitter:description" content={SITE_CONFIG.defaultMetaDescription} />
        <meta name="twitter:image" content={SITE_CONFIG.banner} />
        <meta name="twitter:site" content={SITE_CONFIG.twitter} />

        {/* Critical resource hints for LCP optimization */}
        <link rel="preload" href="/fonts/Inter-VariableFont_slnt,wght.ttf" as="font" type="font/ttf" crossOrigin="" />
        <link rel="preconnect" href="https://wsrdqcvzoshyjvtfsjjp.supabase.co" />
        <link rel="preconnect" href="https://can.seedsn.app" />
      </Head>
      <OrganizationSchema />
      <WebSiteSchema />
      <Script id="x-widgets" strategy="lazyOnload" src="https://platform.twitter.com/widgets.js" />

      {/* Sticky top bar (matches domain page style) */}
      <div className={styles.stickyTopbar}>
        {/* Left: gopher logo (no back link on home) */}
        <div className={styles.topNavLink} aria-label="go4.me">
          <Image src="/collection-icon.png" alt="go4.me" width={40} height={40} />
        </div>
        {/* Middle: search input */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Input
            icon="search"
            size="large"
            placeholder="Search for go4s…"
            value={rawSearch}
            onChange={(_, data: InputOnChangeData) => setRawSearch(String(data.value ?? ''))}
            style={{ width: '100%', maxWidth: 'min(95vw, 2100px)' }}
          />
        </div>
        {/* Right: actions (wallet + theme toggle) */}
        <div className={styles.topNavActions}>
          <GlobalWalletBar inline />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
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
              transition: 'all 0.2s ease',
            }}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </div>

      <Container textAlign="center" style={{ paddingTop: 84, paddingBottom: 10 }}>
        <div
          style={{
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Image
            src="/collection-icon.png"
            alt="go4.me collection icon"
            width={180}
            height={180}
            style={{ filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.35))' }}
            priority
          />
        </div>
        <div id="how-it-works" className={styles.claimText} style={{ marginTop: 14, color: '#666' }}>
          Claim your free, custom go4.me PFP and earn royalties whenever others purchase it!
          <br /> Simply share your XCH address and tag{' '}
          <a href="https://x.com/go4mebot" target="_blank" rel="noreferrer">
            @go4mebot
          </a>{' '}
          on X to kick things off!
        </div>
        <div
          className={styles.desktopCtaButtons}
          style={{
            marginTop: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <a
            href={`https://x.com/intent/tweet?text=Hi @go4mebot! My XCH address is: `}
            target="_blank"
            rel="noreferrer"
            className={styles.ctaButton}
            aria-label="Claim your go4me PFP on X"
            title="Claim your go4me PFP on X"
          >
            Claim your free #1 go4me PFP on{' '}
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              𝕏
            </span>
          </a>
          <Link
            href="/how-it-works"
            className={`${styles.ctaButton} ${styles.ctaButtonLight}`}
            aria-label="How does it work?"
            title="How does it work?"
          >
            How does it work?
          </Link>
        </div>
      </Container>

      {/* Search input moved to sticky top bar */}

      <Container style={{ marginTop: 30 }}>
        {/* Desktop Menu */}
        <Menu secondary pointing className={styles.desktopTabMenu}>
          <Menu.Item name="Total Editions Sold" active={view === 'totalSold'} onClick={() => setView('totalSold')} />
          <Menu.Item name="Total Traded Value" active={view === 'totalTraded'} onClick={() => setView('totalTraded')} />
          <Menu.Item name="Badge Score" active={view === 'badgeScore'} onClick={() => setView('badgeScore')} />
          <Menu.Item name="Shadow Score" active={view === 'shadowScore'} onClick={() => setView('shadowScore')} />
          <Menu.Item name="rarest" content="Rarest go4s" active={view === 'rarest'} onClick={() => setView('rarest')} />
          <Menu.Item name="Recent Trades" active={view === 'recentTrades'} onClick={() => setView('recentTrades')} />
          <Menu.Item
            name="Marmot Recovery Fund"
            active={view === 'marmotRecovery'}
            onClick={() => setView('marmotRecovery')}
            as="div"
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
                  border: '1px solid var(--color-border)',
                }}
              >
                ?
              </span>
            </Link>
          </Menu.Item>
          <Menu.Item name="Queue" active={view === 'queue'} onClick={() => setView('queue')} />
        </Menu>

        {/* Mobile Dropdown */}
        <div className={styles.mobileTabSelector}>
          <select
            value={view}
            onChange={(e) => {
              const v = e.target.value
              if (isValidView(v)) setView(v)
            }}
            className={styles.mobileTabDropdown}
          >
            <option value="totalSold">Total Editions Sold</option>
            <option value="totalTraded">Total Traded Value</option>
            <option value="badgeScore">Badge Score</option>
            <option value="shadowScore">Shadow Score</option>
            <option value="rarest">Rarest go4s</option>
            <option value="recentTrades">Recent Trades</option>
            <option value="marmotRecovery">Marmot Recovery Fund</option>
            <option value="queue">Queue</option>
          </select>
        </div>

        <Segment basic style={{ padding: 0 }}>
          <div className={styles.lbGrid}>
            {renderList.map((u, idx) => (
              <PfpCard key={u.id} user={u} index={idx} view={view} rootHostForLinks={rootHostForLinks} />
            ))}
            {renderList.length === 0 && !isLoadingMore && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0', color: '#666' }}>
                {view === 'queue' ? '🎉 Queue is empty! All NFTs have been generated.' : 'No results.'}
              </div>
            )}
            {isLoadingMore &&
              !query &&
              [...Array(6)].map((_, i) => (
                <div key={`sk-${i}`} className={styles.lbSkeletonCard}>
                  <div className={`${styles.skeleton} ${styles.lbSkeletonImg}`} />
                  <div className={`${styles.skeleton} ${styles.lbSkeletonLine}`} style={{ width: '60%' }} />
                  <div className={`${styles.skeleton} ${styles.lbSkeletonLine}`} style={{ width: '40%' }} />
                  <div className={`${styles.skeleton} ${styles.lbSkeletonLine}`} style={{ width: '70%' }} />
                </div>
              ))}
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
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: isLoadingMore ? 0.6 : 1,
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
            aria-label="Back to top"
            title="Back to top"
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
              transition: 'all 0.2s ease',
            }}
          >
            <Icon name="arrow up" />
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
              target="_blank"
              rel="noreferrer"
              className={styles.mobileBottomClaimButton}
              aria-label="Claim your go4me PFP on X"
              title="Claim your go4me PFP on X"
            >
              Claim your Free PFP
            </a>

            {/* How it works button */}
            <Link
              href="/how-it-works"
              className={styles.mobileBottomHowButton}
              aria-label="How does it work?"
              title="How does it work?"
            >
              How it works
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
