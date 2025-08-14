import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button, Icon, Menu, Input } from 'semantic-ui-react'
import { useTheme } from './_app'
import { useRouter } from 'next/router'

// Flip component for the main profile PFP on the domain page
function DomainPfpFlip({ avatarUrl, xPfpUrl, username, linkHref }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
    setIsTouch(!!touchCapable)
  }, [])

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
    borderRadius: 12,
    overflow: 'hidden'
  }
  const backStyle = {
    ...faceStyle,
    transform: 'rotateY(180deg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const commonAlt = `${username || 'user'} avatar`

  return (
    <div
      className={styles.avatarBox}
      style={{ position: 'absolute', inset: 0 }}
      onMouseEnter={() => { if (!isTouch) setIsFlipped(true) }}
      onMouseLeave={() => { if (!isTouch) setIsFlipped(false) }}
    >
      {/* Flip toggle pill in upper-left, matching badge styling */}
      <div
        className={styles.rankBadge}
        title={isFlipped ? 'Show new PFP' : 'Show original PFP'}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsFlipped(v => !v) }}
        style={{ top: 0, left: 0, right: 'auto', zIndex: 5, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 0, lineHeight: 1, backgroundColor: 'var(--badge-bg-solid)', color: 'var(--badge-fg-solid)' }}
      >
        <Icon name='refresh' style={{ margin: 0 }} />
      </div>

      {/* Flip container */}
      <div style={{ position: 'absolute', inset: 0, perspective: 900 }}>
        <div style={flipInnerStyle}>
          {/* Front: New PFP */}
          <div style={faceStyle}>
            {linkHref ? (
              <a href={linkHref} target='_blank' rel='noreferrer noopener' aria-label={username ? `Open full-size avatar for ${username}` : 'Open full-size avatar'} style={{ position: 'absolute', inset: 0 }}>
                <Image src={avatarUrl} alt={commonAlt} layout='fill' objectFit='cover' />
              </a>
            ) : (
              <div style={{ position: 'absolute', inset: 0 }}>
                <Image src={avatarUrl} alt={commonAlt} layout='fill' objectFit='cover' />
              </div>
            )}
          </div>

          {/* Back: Original PFP in a circle mask */}
          <div style={backStyle}>
            {linkHref ? (
              <a href={linkHref} target='_blank' rel='noreferrer noopener' aria-label={username ? `Open full-size avatar for ${username}` : 'Open full-size avatar'} style={{ position: 'absolute', inset: 0 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '88%', height: '88%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden' }}>
                  <Image src={xPfpUrl || avatarUrl} alt={commonAlt} layout='fill' objectFit='cover' />
                </div>
              </a>
            ) : (
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '88%', height: '88%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden' }}>
                <Image src={xPfpUrl || avatarUrl} alt={commonAlt} layout='fill' objectFit='cover' />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps(ctx) {
  const { req, query } = ctx
  let username = (query.pfp || query.username || '').toString().trim()
  const searchQ = (query.q || '').toString().trim()

  if (!username) {
    // Derive from host header if reaching /domain directly
    const hostHeader = req.headers.host || ''
    const host = hostHeader.split(':')[0]
    const normalized = host === '127.0.0.1' ? 'localhost' : host
    if (normalized.endsWith('.go4.me') || normalized.endsWith('.localhost')) {
      username = normalized.split('.')[0]
    }
  }

  if (!username) return { notFound: true }
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(username)) return { notFound: true }

  const PAGE_SIZE = 60
  let user = null
  let ownedPfps = []
  let otherOwners = []
  let ownedHasMore = false
  let othersHasMore = false
  try {
    const supabase = getSupabaseClient()
    if (supabase) {
      const { data, error } = await supabase
        .from('get_user_page_info')
        .select('*')
        .ilike('username', username)
        .limit(1)
      if (error) throw error
      if (data && data.length > 0) {
        const row = data[0]
        user = {
          username: row.username,
          fullName: row.name || '',
          description: row.description || '',
          avatarUrl: 'https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-go4me.png',
          xPfpUrl: 'https://can.seedsn.app/ipfs/' + row.pfp_ipfs_cid + '/' + row.username + '-x.png',
          xchAddress: row.xch_address || '',
          lastOfferId: row.last_offerid || '',
          totalBadgeScore: row.total_badge_score || 0,
        }
      }

      // Attempt to load owned PFP NFTs (best-effort; swallow errors so profile still renders)
      try {
        let ownedQuery = supabase
          .from('get_user_page_owned_pfps')
          .select('*', { count: 'exact' })
          .ilike('username', username)
          .range(0, PAGE_SIZE - 1)
        if (searchQ) {
          // Filter by pfp username or name
          ownedQuery = ownedQuery.or(`pfp_username.ilike.%${searchQ}%,pfp_name.ilike.%${searchQ}%`)
        }
        const { data: ownedData, count: ownedCount, error: ownedError } = await ownedQuery
        if (ownedError) throw ownedError
        if (Array.isArray(ownedData)) {
          ownedPfps = ownedData.map((r, idx) => {
            const image = r.thumbnail_uri
            return {
              id: r.nft_id || r.id || `owned-${idx}`,
              image,
              pfpName: r.pfp_name || r.name || `#${r.nft_id || idx + 1}`,
              pfpUsername: r.pfp_username || r.username || null
            }
          })
          ownedHasMore = ownedData.length === PAGE_SIZE
          // Attach count
          ownedPfps._totalCount = typeof ownedCount === 'number' ? ownedCount : ownedData.length
        }
      } catch (ownedErr) {
        console.warn('Owned PFP fetch failed (non-fatal)', ownedErr)
      }

      // Attempt to load other owners collection (same shape)
      try {
        let othersQuery = supabase
          .from('get_user_page_other_owners')
          .select('*', { count: 'exact' })
          .ilike('username', username)
          .range(0, PAGE_SIZE - 1)
        if (searchQ) {
          othersQuery = othersQuery.or(`pfp_username.ilike.%${searchQ}%,pfp_name.ilike.%${searchQ}%`)
        }
        const { data: othersData, count: othersCount, error: othersError } = await othersQuery
        if (othersError) throw othersError
        if (Array.isArray(othersData)) {
          otherOwners = othersData.map((r, idx) => {
            const image = r.thumbnail_uri
            return {
              id: r.nft_id || r.id || `other-${idx}`,
              image,
              pfpName: r.pfp_name || r.name || `#${r.nft_id || idx + 1}`,
              pfpUsername: r.pfp_username || r.username || null
            }
          })
          othersHasMore = othersData.length === PAGE_SIZE
          // Attach count
          otherOwners._totalCount = typeof othersCount === 'number' ? othersCount : othersData.length
        }
      } catch (othersErr) {
        console.warn('Other owners fetch failed (non-fatal)', othersErr)
      }
    }
  } catch (e) {
    console.error('Failed to load user profile', e)
  }

  if (!user) return { notFound: true }

  // Build root host (remove the username subdomain while preserving port)
  const hostHeader = req.headers.host || ''
  const [hostNoPort, portPart] = hostHeader.split(':')
  let rootHostForLinks = hostNoPort
  if (hostNoPort.includes('.') && username && hostNoPort.toLowerCase().startsWith(username.toLowerCase() + '.')) {
    // Strip only the first label (the username)
    const parts = hostNoPort.split('.')
    parts.shift()
    rootHostForLinks = parts.join('.')
  }
  if (portPart) rootHostForLinks += ':' + portPart

  const ownedCount = (ownedPfps && ownedPfps._totalCount) ? ownedPfps._totalCount : (Array.isArray(ownedPfps) ? ownedPfps.length : 0)
  const othersCount = (otherOwners && otherOwners._totalCount) ? otherOwners._totalCount : (Array.isArray(otherOwners) ? otherOwners.length : 0)
  return { props: { user, ownedPfps, otherOwners, ownedHasMore, othersHasMore, pageSize: PAGE_SIZE, rootHostForLinks, ownedCount, othersCount, initialQuery: searchQ } }
}

export default function DomainPage({ user, ownedPfps = [], otherOwners = [], ownedHasMore = false, othersHasMore = false, pageSize = 60, rootHostForLinks, ownedCount = 0, othersCount = 0, initialQuery = '' }) {
  const { username, fullName, description, avatarUrl, xPfpUrl, xchAddress, lastOfferId, totalBadgeScore = 0 } = user
  const formattedBadgeScore = useMemo(() => {
    const n = Number(totalBadgeScore)
    return Number.isFinite(n) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n) : '0'
  }, [totalBadgeScore])
  const [copied, setCopied] = useState(false)
  const [collectionTab, setCollectionTab] = useState('my') // 'my' | 'others'
  // Infinite scroll state
  const [ownedList, setOwnedList] = useState(() => ownedPfps)
  const [ownedPage, setOwnedPage] = useState(1) // next page index (0 preloaded)
  const [ownedMore, setOwnedMore] = useState(ownedHasMore)
  const [othersList, setOthersList] = useState(() => otherOwners)
  const [othersPage, setOthersPage] = useState(1)
  const [othersMore, setOthersMore] = useState(othersHasMore)
  const [ownedTotalCount, setOwnedTotalCount] = useState(ownedCount || 0)
  const [othersTotalCount, setOthersTotalCount] = useState(othersCount || 0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const [intersectionSupported, setIntersectionSupported] = useState(true)
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [rawSearch, setRawSearch] = useState(initialQuery || '')
  const [query, setQuery] = useState(initialQuery || '')

  // Birthday: celebrate hoffmang on Aug 14 only (client-side)
  const isHoffBirthday = useMemo(() => {
    if (!username) return false
    if (String(username).toLowerCase() !== 'hoffmang') return false
    if (typeof window === 'undefined') return false
    const now = new Date()
    return now.getMonth() === 7 && now.getDate() === 14 // August is month 7 (0-indexed)
  }, [username])
  const [showBday, setShowBday] = useState(false)

  useEffect(() => {
    if (!isHoffBirthday) return
  setShowBday(true)
    // Lightweight confetti animation without external libs
    const duration = 5000
    const end = Date.now() + duration
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.inset = '0'
    canvas.style.zIndex = '1200'
    canvas.style.pointerEvents = 'none'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const colors = ['#ff577f','#ff884b','#ffd384','#baddff','#a2de96','#c77dff']
    const rand = (min, max) => Math.random() * (max - min) + min
    let fallingOut = false // after duration, stop respawning and let pieces fall off-screen
    const particles = Array.from({ length: 160 }).map(() => ({
      x: Math.random() * canvas.width,
      y: rand(-canvas.height * 0.3, -10),
      r: rand(4, 8),
      color: colors[(Math.random() * colors.length) | 0],
      vx: rand(-2, 2),
      vy: rand(2, 5),
      ay: 0.05,
      rot: rand(0, 360),
      vr: rand(-5, 5),
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
      alive: true
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const now = Date.now()
      if (!fallingOut && now >= end) fallingOut = true
      for (const p of particles) {
        if (!p.alive) continue
        p.x += p.vx; p.y += p.vy; p.vy += p.ay; p.rot += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180); ctx.fillStyle = p.color
        if (p.shape === 'rect') ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2)
        else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill() }
        ctx.restore()
        if (p.y - p.r > canvas.height) {
          if (fallingOut) {
            p.alive = false // stop drawing this particle; it's off-screen now
          } else {
            // respawn during active burst
            p.x = Math.random() * canvas.width; p.y = -10; p.vy = rand(2, 5); p.vx = rand(-2, 2)
          }
        }
      }
      // Keep animating while burst is active or until all particles have fallen off
      if (!fallingOut || particles.some(p => p.alive)) {
        requestAnimationFrame(draw)
      } else {
        window.removeEventListener('resize', resize)
        try { document.body.removeChild(canvas) } catch {}
      }
    }
  const raf = requestAnimationFrame(draw)
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); try { document.body.removeChild(canvas) } catch {} }
  }, [isHoffBirthday])

  useEffect(() => {
    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) setIntersectionSupported(false)
  }, [])

  const mapRow = useCallback((r, idx, prefix='dyn') => ({
    id: r.nft_id || r.id || `${prefix}-${idx}`,
    image: r.thumbnail_uri || r.image_url || r.generated_pfp_url || '',
    pfpName: r.pfp_name || r.name || `#${r.nft_id || idx + 1}`,
    pfpUsername: r.pfp_username || r.username || null
  }), [])

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return
    const isMy = collectionTab === 'my'
    if (isMy && !ownedMore) return
    if (!isMy && !othersMore) return
    setIsLoadingMore(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) return
      const currentPage = isMy ? ownedPage : othersPage
      const from = currentPage * pageSize
      const to = from + pageSize - 1
      const viewName = isMy ? 'get_user_page_owned_pfps' : 'get_user_page_other_owners'
      let qb = supabase
        .from(viewName)
        .select('*')
        .ilike('username', username)
        .range(from, to)
      if (query) {
        qb = qb.or(`pfp_username.ilike.%${query}%,pfp_name.ilike.%${query}%`)
      }
      const { data, error } = await qb
      if (error) throw error
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((r, i) => mapRow(r, currentPage * pageSize + i, isMy ? 'owned' : 'other'))
        if (isMy) {
          setOwnedList(prev => [...prev, ...mapped])
          setOwnedPage(p => p + 1)
          setOwnedMore(data.length === pageSize)
        } else {
          setOthersList(prev => [...prev, ...mapped])
          setOthersPage(p => p + 1)
          setOthersMore(data.length === pageSize)
        }
      } else {
        if (isMy) setOwnedMore(false); else setOthersMore(false)
      }
    } catch (e) {
      console.error('Failed to load more collection rows', e)
      if (collectionTab === 'my') setOwnedMore(false); else setOthersMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [collectionTab, isLoadingMore, ownedMore, othersMore, ownedPage, othersPage, pageSize, username, mapRow])

  // Debounce search input -> query and sync URL (?q=) without changing pathname (preserve rewrites)
  useEffect(() => {
    const t = setTimeout(() => {
      const newQ = rawSearch.trim()
      setQuery(newQ)
      // Use History API to avoid exposing the internal /domain route when behind rewrites
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href)
          if (newQ) url.searchParams.set('q', newQ)
          else url.searchParams.delete('q')
          window.history.replaceState({}, '', url.toString())
        } catch (_) {
          // no-op
        }
      }
    }, 300)
    return () => clearTimeout(t)
  }, [rawSearch])

  // When query changes: reset current tab list and fetch first page; also refresh counts
  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return
    let cancelled = false
    const fetchCounts = async () => {
      try {
        // Owned count
        let ownedCountQ = supabase
          .from('get_user_page_owned_pfps')
          .select('*', { count: 'exact', head: true })
          .ilike('username', username)
        if (query) ownedCountQ = ownedCountQ.or(`pfp_username.ilike.%${query}%,pfp_name.ilike.%${query}%`)
        const ownedResp = await ownedCountQ
        if (!cancelled) setOwnedTotalCount(ownedResp.count || 0)
        // Others count
        let othersCountQ = supabase
          .from('get_user_page_other_owners')
          .select('*', { count: 'exact', head: true })
          .ilike('username', username)
        if (query) othersCountQ = othersCountQ.or(`pfp_username.ilike.%${query}%,pfp_name.ilike.%${query}%`)
        const othersResp = await othersCountQ
        if (!cancelled) setOthersTotalCount(othersResp.count || 0)
      } catch (e) {
        console.error('Failed to refresh counts', e)
      }
    }
    const fetchFirstPage = async () => {
      try {
        const isMy = collectionTab === 'my'
        const viewName = isMy ? 'get_user_page_owned_pfps' : 'get_user_page_other_owners'
        let qb = supabase
          .from(viewName)
          .select('*')
          .ilike('username', username)
          .range(0, pageSize - 1)
        if (query) qb = qb.or(`pfp_username.ilike.%${query}%,pfp_name.ilike.%${query}%`)
        const { data, error } = await qb
        if (error) throw error
        const mapped = Array.isArray(data) ? data.map((r, i) => mapRow(r, i, isMy ? 'owned' : 'other')) : []
        if (cancelled) return
        if (isMy) {
          setOwnedList(mapped)
          setOwnedPage(1)
          setOwnedMore((data || []).length === pageSize)
        } else {
          setOthersList(mapped)
          setOthersPage(1)
          setOthersMore((data || []).length === pageSize)
        }
      } catch (e) {
        console.error('Failed to refresh first page', e)
        if (collectionTab === 'my') { setOwnedList([]); setOwnedMore(false); setOwnedPage(1) }
        else { setOthersList([]); setOthersMore(false); setOthersPage(1) }
      }
    }
    fetchCounts()
    fetchFirstPage()
    return () => { cancelled = true }
  }, [query, collectionTab, pageSize, username, mapRow])

  // Re-observe sentinel when tab changes
  useEffect(() => {
    if (!intersectionSupported) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) loadMore() })
    }, { rootMargin: '300px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, intersectionSupported, collectionTab])

  // Build canonical URLs for social cards
  const isLocal = rootHostForLinks && rootHostForLinks.includes('localhost')
  const scheme = isLocal ? 'http' : 'https'
  const pageUrl = rootHostForLinks ? `${scheme}://${username}.${rootHostForLinks}/` : ''
  let ogImage = avatarUrl || '/templates/pfp0001.png'
  if (!/^https?:\/\//i.test(ogImage)) {
    if (rootHostForLinks) {
      // Ensure leading slash
      if (!ogImage.startsWith('/')) ogImage = '/' + ogImage
      ogImage = `${scheme}://${rootHostForLinks}${ogImage}`
    }
  }
  const metaTitle = fullName ? `${fullName} (@${username}) on go4.me` : `@${username} on go4.me`
  const metaDesc = description ? description.slice(0, 200) : 'Claim your free, custom go4.me PFP and earn royalties whenever others purchase it.'

  const handleCopy = async () => {
    if (!xchAddress) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(xchAddress)
      } else {
        // Fallback
        const ta = document.createElement('textarea')
        ta.value = xchAddress
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  // Turn URLs in description into clickable links (http(s):// and www.)
  const linkify = useCallback((text) => {
    if (!text || typeof text !== 'string') return text
    const nodes = []
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    let lastIndex = 0
    let match
    while ((match = urlRegex.exec(text)) !== null) {
      const start = match.index
      let url = match[0]
      // Strip common trailing punctuation from URL display
      const trailingMatch = url.match(/[),.;:!?]+$/)
      let trailing = ''
      if (trailingMatch) {
        trailing = trailingMatch[0]
        url = url.slice(0, -trailing.length)
      }
      if (start > lastIndex) nodes.push(text.slice(lastIndex, start))
      const href = url.startsWith('http') ? url : `https://${url}`
  // For display, drop protocol (keep www. if present) and trailing slash
  const displayText = url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
      nodes.push(
        <a key={`u-${start}`} href={href} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--color-link, #3aa0ff)' }}>
          {displayText}
        </a>
      )
      if (trailing) nodes.push(trailing)
      lastIndex = start + match[0].length
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
    return nodes
  }, [])
  return (
    <div className={styles.container}>
      <Head>
        <title>{username}.go4.me</title>
        <link rel="icon" href="/collection-icon.png" />
        {/* Open Graph / Twitter Card Meta */}
        {pageUrl && <link rel="canonical" href={pageUrl} />}
        <meta property="og:site_name" content="go4.me" />
        {pageUrl && <meta property="og:url" content={pageUrl} />}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={`${username} profile image`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:site" content="@go4mebot" />
      </Head>
  {/* Sticky top bar with centered search */}
  <div className={styles.stickyTopbar}>
        {rootHostForLinks ? (
          <a href={`//${rootHostForLinks}/`} aria-label="Back to leaderboard home" className={styles.topNavLink}>
            <Image src="/collection-icon.png" alt="go4.me" width={40} height={40} />
            ← Back to Leaderboard
          </a>
        ) : (
          <Link href="/" aria-label="Back to leaderboard home" className={styles.topNavLink}>
            <Image src="/collection-icon.png" alt="go4.me" width={40} height={40} />
            ← Back to Leaderboard
          </Link>
        )}
        {/* Center: search */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Input
            icon='search'
            size='large'
            placeholder='Search this page…'
            value={rawSearch}
            onChange={(e, { value }) => setRawSearch(value)}
            style={{ width: '100%', maxWidth: 520 }}
          />
        </div>
        <div className={styles.topNavActions}>
          <Button
            as='a'
            href={`https://x.com/intent/tweet?text=Hi @go4mebot! My XCH address is: `}
            target='_blank'
            rel='noreferrer'
            size='small'
            basic
            color='grey'
            aria-label='Claim your go4me PFP on X'
            title='Claim your go4me PFP on X'
            style={{ height: 34 }}
          >
Claim your free #1 go4me PFP on <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, fontSize: 18, fontWeight: 800}}>𝕏</span>
          </Button>
          <Button
            type='button'
            onClick={toggleTheme}
            basic
            color='grey'
            size='small'
            aria-label='Toggle dark mode'
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{ height: 34 }}
            icon
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </Button>
        </div>
      </div>
  <main className={styles.main} style={{ justifyContent: 'flex-start', paddingTop: 64, paddingBottom: 24 }}>
  {/* Birthday banner under the sticky nav, above profile name */}
  {showBday && (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0.75rem auto 0.25rem', padding: '10px 14px', background: 'linear-gradient(90deg, #fff3cd, #ffe8a1)', border: '1px solid #ffecb5', color: '#775500', borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
      <span role="img" aria-label="party popper">🎉</span>
      Happy Birthday, {'@' + username}! 🎂
    </div>
  )}
  <div className={styles.profileHeader} style={{ marginTop: '0.5rem', width: '100%', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto', alignSelf: 'stretch' }}>
          <div className={styles.profileLeft}>
            <div className={styles.avatarWrap}>
              <DomainPfpFlip avatarUrl={avatarUrl} xPfpUrl={xPfpUrl} username={username} linkHref={avatarUrl || undefined} />
            </div>
          </div>
          <div className={styles.profileRight}>
            <h1 style={{ margin: 0, fontSize: 48, lineHeight: 1.05 }}>{fullName}</h1>
            <div style={{ fontWeight: 400, fontSize: 24, marginTop: 6 }}>
              <a
                href={`https://x.com/${username}`}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: '#888', textDecoration: 'none' }}
                aria-label={`View @${username} on X`}
              >
                @{username}
              </a>
            </div>
            {/* Birthday banner moved above; keeping name clean here */}
            {description && (
              <p style={{ margin: '18px 0 16px', fontSize: 18, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{linkify(description)}</p>
            )}

            {xchAddress && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {(() => {
                    const full = xchAddress
                    const display = full.length > 20 ? `${full.slice(0,8)}...${full.slice(-8)}` : full
                    return (
                      <code
                        title={full}
                        style={{
                          background: 'var(--color-card-bg, #111)',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 14,
                          lineHeight: '18px',
                          color: '#bbb',
                          maxWidth: 520,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: '0 1 auto'
                        }}
                        aria-label='XCH address'
                      >
                        {display}
                      </code>
                    )
                  })()}
                  <button
                    onClick={handleCopy}
                    aria-label='Copy XCH address'
                    style={{
                      cursor: 'pointer',
                      background: copied ? 'var(--color-link, #0b5)' : 'var(--color-card-bg, #1b1b1b)',
                      color: copied ? '#fff' : 'var(--color-text, #eee)',
                      border: '1px solid var(--color-border, #333)',
                      padding: '6px 10px',
                      fontSize: 12,
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 500,
                      transition: 'background .15s, color .15s, border-color .15s',
                      flex: '0 0 auto'
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {lastOfferId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                      as='a'
                      href={`https://dexie.space/offers/${lastOfferId}`}
                      target='_blank'
                      rel='noreferrer'
                      size='tiny'
                      basic
                      color='blue'
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                      aria-label='View offer on Dexie'
                      title='Dexie'
                    >
                      Get Latest Offer from Dexie
                      <Image
                        src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                        alt="Dexie"
                        width={18}
                        height={18}
                      />
                      <Icon name='external' size='small' />
                    </Button>
                    <Button
                      as='a'
                      href={`https://mintgarden.io/offers/${lastOfferId}`}
                      target='_blank'
                      rel='noreferrer'
                      size='tiny'
                      basic
                      color='green'
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                      aria-label='View offer on Mintgarden'
                      title='Mintgarden'
                    >
                      Get Latest Offer from Mintgarden
                      <Image
                        src="https://mintgarden.io/mint-logo-round.svg"
                        alt="MintGarden"
                        width={18}
                        height={18}
                      />
                      <Icon name='external' size='small' />
                    </Button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
        
    {/* Collection Tabs */}
  <div style={{ marginTop: 30, width: '100%', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto', alignSelf: 'stretch' }}>
          <Menu secondary pointing style={{ marginBottom: 10 }}>
            <Menu.Item
              name='my'
              active={collectionTab === 'my'}
              onClick={() => setCollectionTab('my')}
            >
              My Collection ({ownedTotalCount || 0})
            </Menu.Item>
            <Menu.Item
              name='others'
              active={collectionTab === 'others'}
              onClick={() => setCollectionTab('others')}
            >
              Other Owners ({othersTotalCount || 0})
            </Menu.Item>
          </Menu>
          <div style={{ margin: '4px 0 18px', fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-subtle)', maxWidth: 760 }}>
            {collectionTab === 'my' ? (
              <>
                <span>Send go4me PFPs to the address above and they will show up here. Your current Badge Score for $G4M airdrops is {formattedBadgeScore}!</span>
              </>
            ) : (
              <span>These collectors own your PFP. Why not return the favor?</span>
            )}
          </div>
          {(() => {
            const list = collectionTab === 'my' ? ownedList : othersList
            if (!list || list.length === 0) {
              return <div style={{ textAlign: 'center', opacity: 0.55, fontSize: 14 }}>{collectionTab === 'my' ? 'No owned PFPs to display yet.' : 'No other owner PFPs to display.'}</div>
            }
            return (
              <div className={styles.lbGrid} style={{ alignItems: 'stretch' }}>
                {list.map(item => {
                  const subHref = item.pfpUsername ? `//${item.pfpUsername}.${(rootHostForLinks || 'go4.me')}/` : null
                  return (
                    <div key={item.id} className={styles.lbCard} style={{ minHeight: 230 }}>
                      {subHref ? (
                        <a
                          href={subHref}
                          className={styles.cardImgWrap}
                          aria-label={`Open ${item.pfpUsername}.go4.me`}
                        >
                          <Image src={item.image} alt={item.pfpName || item.pfpUsername || 'pfp'} layout='fill' objectFit='cover' />
                        </a>
                      ) : (
                        <div className={styles.cardImgWrap}>
                          <Image src={item.image} alt={item.pfpName || item.pfpUsername || 'pfp'} layout='fill' objectFit='cover' />
                        </div>
                      )}
                      <div className={styles.cardBody}>
                        {item.pfpName && (
                          <div className={styles.fullName} style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }} title={item.pfpName}>{item.pfpName}</div>
                        )}
                        {item.pfpUsername && (
                          <div className={styles.username} style={{ fontSize: 12 }} title={`@${item.pfpUsername}`}>
                            <a
                              href={`https://x.com/${item.pfpUsername}`}
                              style={{ color: 'inherit', textDecoration: 'none' }}
                              aria-label={`View @${item.pfpUsername} on X`}
                            >
                              @{item.pfpUsername}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={sentinelRef} style={{ height: 1, gridColumn: '1 / -1' }} />
              </div>
            )
          })()}
          {(collectionTab === 'my' ? ownedMore : othersMore) && !intersectionSupported && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button size='small' onClick={loadMore} loading={isLoadingMore} disabled={isLoadingMore}>Load more</Button>
            </div>
          )}
          {isLoadingMore && (
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, opacity: 0.6 }}>Loading…</div>
          )}
        </div>
  </main>
  {/* Footer removed; link moved to top bar */}
    </div>
  )
}
