import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button, Icon, Menu, Input } from 'semantic-ui-react'
import { useTheme } from './_app'
// Flip component for profile avatar (front: go4me PFP, back: X image)
function DomainPfpFlip({ avatarUrl, xPfpUrl, username, linkHref, rankCopiesSold }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
    setIsTouch(!!touchCapable)
  }, [])

  const commonAlt = username ? `${username} avatar` : 'avatar'

  const flipInnerStyle = {
    position: 'absolute',
    inset: 0,
    transformStyle: 'preserve-3d',
    transition: 'transform 420ms cubic-bezier(0.2, 0.7, 0.2, 1)',
    willChange: 'transform',
    transform: (isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)') + ' translateZ(0)'
  }
  const faceStyle = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transform: 'translateZ(0)',
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

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onMouseEnter={() => { if (!isTouch) setIsFlipped(true) }}
      onMouseLeave={() => { if (!isTouch) setIsFlipped(false) }}
      onClick={(e) => { if (isTouch) { e.preventDefault(); setIsFlipped(v => !v) } }}
    >
      <div style={{ position: 'absolute', inset: 0, perspective: 1000 }}>
        <div style={flipInnerStyle}>
          {/* Front */}
          <div style={faceStyle}>
            {linkHref ? (
              <a href={linkHref} target='_blank' rel='noreferrer noopener' aria-label={username ? `Open full-size avatar for ${username}` : 'Open full-size avatar'} style={{ position: 'absolute', inset: 0 }}>
                <Image src={avatarUrl} alt={commonAlt} fill style={{ objectFit: 'cover' }} />
              </a>
            ) : (
              <div style={{ position: 'absolute', inset: 0 }}>
                <Image src={avatarUrl} alt={commonAlt} fill style={{ objectFit: 'cover' }} />
              </div>
            )}
          </div>

          {/* Back: Original PFP in a circle mask */}
          <div style={backStyle} className={styles.backfaceHidden}>
            {linkHref ? (
              <a href={linkHref} target='_blank' rel='noreferrer noopener' aria-label={username ? `Open full-size avatar for ${username}` : 'Open full-size avatar'} style={{ position: 'absolute', inset: 0 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '88%', height: '88%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden' }}>
                  <Image src={xPfpUrl || avatarUrl} alt={commonAlt} fill style={{ objectFit: 'cover' }} />
                </div>
              </a>
            ) : (
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '88%', height: '88%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden' }}>
                <Image src={xPfpUrl || avatarUrl} alt={commonAlt} fill style={{ objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Flip component for collection grid thumbnails (cards)
function PfpFlipThumb({
  frontUrl,
  backUrl,
  username,
  profileHref,
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
    setIsTouch(!!touchCapable)
  }, [])

  const commonAlt = username ? `${username} avatar` : 'avatar'

  const flipInnerStyle = {
    position: 'absolute',
    inset: 0,
    transformStyle: 'preserve-3d',
    transition: 'transform 360ms cubic-bezier(0.2, 0.7, 0.2, 1)',
    willChange: 'transform',
    transform: (isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)') + ' translateZ(0)'
  }
  const faceStyle = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  transform: 'translateZ(0)',
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

  return (
    <div
      className={styles.cardImgWrap}
      style={{ position: 'relative' }}
      onMouseEnter={() => { if (!isTouch) setIsFlipped(true) }}
      onMouseLeave={() => { if (!isTouch) setIsFlipped(false) }}
      onClick={(e) => { if (isTouch) { e.preventDefault(); setIsFlipped(v => !v) } }}
    >
      {/* Removed inline flip button for grid cards; hover flips on desktop, tap toggles on touch */}

      <div style={{ position: 'absolute', inset: 0, perspective: 900 }} className={styles.preserve3d}>
        <div style={flipInnerStyle} className={styles.preserve3d}>
          {/* Front */}
          <div style={faceStyle} className={styles.backfaceHidden}>
            {profileHref ? (
              <a href={profileHref} aria-label={username ? `Open ${username}.go4.me` : 'Open profile'}>
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Image src={frontUrl} alt={commonAlt} fill style={{ objectFit: 'cover' }} />
                </div>
              </a>
            ) : (
              <div style={{ position: 'absolute', inset: 0 }}>
                <Image src={frontUrl} alt={commonAlt} fill style={{ objectFit: 'cover' }} />
              </div>
            )}
          </div>
          {/* Back (circle mask) */}
          <div style={backStyle} className={styles.backfaceHidden}>
            {profileHref ? (
              <a href={profileHref} aria-label={username ? `Open ${username}.go4.me` : 'Open profile'} style={{ position: 'absolute', inset: 0 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '80%', height: '80%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                  <Image src={backUrl} alt={commonAlt} fill style={{ objectFit: 'cover' }} />
                </div>
              </a>
            ) : (
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '80%', height: '80%', transform: 'translate(-50%, -50%)', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}>
                <Image src={backUrl} alt={commonAlt} fill style={{ objectFit: 'cover' }} />
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
          didAddress: row.did_address || null,
          lastOfferId: row.last_offerid || '',
      lastOfferStatus: row.last_offer_status ?? null,
      totalBadgeScore: row.total_badge_score || 0,
      rankCopiesSold: row.rank_copies_sold || null,
      // Queue minutes for ETA under the profile Coming Soon badge
      rankQueuePosition: row.rank_queue_position ?? null,
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
            const pfpUsername = r.pfp_username || r.username || null
            const cid = r.pfp_ipfs_cid || r.pfpCid || r.cid || null
            // Primary image from Supabase view
            const dataUri = r.pfp_data_uri || ''
            // Front prefers data URI; fallback to computed go4me image; last resort: any other provided url
            const frontUrl = dataUri || ((cid && pfpUsername) ? `https://can.seedsn.app/ipfs/${cid}/${pfpUsername}-go4me.png` : (r.image_url || r.generated_pfp_url || ''))
            // Back prefers computed original X image; fallback to data URI
            const backUrl = (cid && pfpUsername) ? `https://can.seedsn.app/ipfs/${cid}/${pfpUsername}-x.png` : (dataUri || r.image_url || r.generated_pfp_url || '')
            return {
              id: r.nft_id || r.id || `owned-${idx}`,
              frontUrl,
              backUrl,
              pfpName: r.pfp_name || r.name || `#${r.nft_id || idx + 1}`,
        pfpUsername,
        lastOfferId: r.last_offerid || r.lastOfferId || null,
        lastOfferStatus: (r.last_offer_status ?? r.lastOfferStatus ?? null),
        rankQueuePosition: r.rank_queue_position ?? null
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
            const pfpUsername = r.pfp_username || r.username || null
            const cid = r.pfp_ipfs_cid || r.pfpCid || r.cid || null
            const dataUri = r.pfp_data_uri || ''
            const frontUrl = dataUri || ((cid && pfpUsername) ? `https://can.seedsn.app/ipfs/${cid}/${pfpUsername}-go4me.png` : (r.image_url || r.generated_pfp_url || ''))
            const backUrl = (cid && pfpUsername) ? `https://can.seedsn.app/ipfs/${cid}/${pfpUsername}-x.png` : (dataUri || r.image_url || r.generated_pfp_url || '')
            return {
              id: r.nft_id || r.id || `other-${idx}`,
              frontUrl,
              backUrl,
              pfpName: r.pfp_name || r.name || `#${r.nft_id || idx + 1}`,
        pfpUsername,
        lastOfferId: r.last_offerid || r.lastOfferId || null,
        lastOfferStatus: (r.last_offer_status ?? r.lastOfferStatus ?? null),
        rankQueuePosition: r.rank_queue_position ?? null
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
  const { username, fullName, description, avatarUrl, xPfpUrl, xchAddress, didAddress, lastOfferId, totalBadgeScore = 0 } = user
  const formattedBadgeScore = useMemo(() => {
    const n = Number(totalBadgeScore)
    return Number.isFinite(n) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n) : '0'
  }, [totalBadgeScore])
  const [copiedXch, setCopiedXch] = useState(false)
  const [copiedDid, setCopiedDid] = useState(false)
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
  const [rawSearch, setRawSearch] = useState(initialQuery || '')
  const [query, setQuery] = useState(initialQuery || '')
  const [isExporting, setIsExporting] = useState(false)
  

  useEffect(() => {
    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) setIntersectionSupported(false)
  }, [])

  const mapRow = useCallback((r, idx, prefix='dyn') => {
    const dataUri = r.pfp_data_uri || ''
    const pfpUsername = r.pfp_username || r.username || null
    const cid = r.pfp_ipfs_cid || r.pfpCid || r.cid || null
    const frontUrl = dataUri || ((cid && pfpUsername) ? `https://can.seedsn.app/ipfs/${cid}/${pfpUsername}-go4me.png` : (r.image_url || r.generated_pfp_url || ''))
    const backUrl = (cid && pfpUsername) ? `https://can.seedsn.app/ipfs/${cid}/${pfpUsername}-x.png` : (dataUri || r.image_url || r.generated_pfp_url || '')
    return {
      id: r.nft_id || r.id || `${prefix}-${idx}`,
      frontUrl,
      backUrl,
      pfpName: r.pfp_name || r.name || `#${r.nft_id || idx + 1}`,
  pfpUsername,
  lastOfferId: r.last_offerid || r.lastOfferId || null,
  lastOfferStatus: (r.last_offer_status ?? r.lastOfferStatus ?? null),
  // If the view supplies queue minutes for this PFP, keep it so we can show ETA.
  rankQueuePosition: r.rank_queue_position ?? null
    }
  }, [])

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
  }, [collectionTab, isLoadingMore, ownedMore, othersMore, ownedPage, othersPage, pageSize, username, mapRow, query])

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

  // removed birthday confetti logic

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
      setCopiedXch(true)
      setTimeout(() => setCopiedXch(false), 1600)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  const handleCopyDid = async () => {
    if (!didAddress) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(didAddress)
      } else {
        const ta = document.createElement('textarea')
        ta.value = didAddress
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedDid(true)
      setTimeout(() => setCopiedDid(false), 1600)
    } catch (e) {
      console.error('Copy DID failed', e)
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

  // Export CSV of Other Owners: username,name,xch_address (respects current search filter)
  const exportOthersCsv = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
  const supabase = getSupabaseClient()

    const PAGE = 1000
      let from = 0
      const rows = []
      // Fetch in chunks to cover all filtered results
      if (supabase) {
        while (true) {
          let qb = supabase
            .from('get_user_page_other_owners')
            .select('*')
            .ilike('username', username)
            .range(from, from + PAGE - 1)
          if (query) qb = qb.or(`pfp_username.ilike.%${query}%,pfp_name.ilike.%${query}%`)

          const { data, error } = await qb
          if (error) throw error
          if (!data || data.length === 0) break
          rows.push(...data)
          if (data.length < PAGE) break
          from += PAGE
        }
      }

      const quote = (val) => {
        const s = (val ?? '').toString()
        // Always wrap in quotes; escape existing quotes
        return '"' + s.replace(/"/g, '""') + '"'
      }
      const sourceRows = rows.length > 0 ? rows : (othersList || [])
      const lines = ['username,name,xch_address']
      for (const r of sourceRows) {
        // Support both Supabase view rows and client-side mapped items
        const u = r.owner_username || ''
        const n = r.owner_name || ''
        const a = r.owner_xch_address || ''
        const d = r.owner_did_address || ''
        lines.push([quote(u), quote(n), quote(a), quote(d)].join(','))
      }
      const csv = lines.join('\n')
      // Use data URI for broad browser compatibility
      const link = document.createElement('a')
      link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
      link.setAttribute('download', `${username}-other-owners-xch.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('CSV export failed', e)
    } finally {
      setIsExporting(false)
    }
  }, [isExporting, query, username, othersList])
  return (
    <div className={styles.container}>
      <Head>
        <title>{`${username}.go4.me`}</title>
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
          {false && username && username.toLowerCase() === 'hoffmang' && (<span />)}
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
  <main className={styles.main} style={{ justifyContent: 'flex-start', paddingTop: 84, paddingBottom: 24 }}>
  <div className={styles.profileHeader} style={{ marginTop: (username && username.toLowerCase() === 'hoffmang') ? '0' : '1rem', width: '100%', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto', alignSelf: 'stretch' }}>
      <div className={styles.profileLeft}>
            <div className={styles.avatarWrap}>
  <DomainPfpFlip avatarUrl={avatarUrl} xPfpUrl={xPfpUrl} username={username} linkHref={avatarUrl || undefined} rankCopiesSold={user?.rankCopiesSold} />
            </div>
            {/* Centered Badge Score under avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              {rootHostForLinks ? (
                <a
                  href={`//${rootHostForLinks}/how-it-works`}
                  className={`${styles.miniBadge} ${styles.largeBadge} ${styles.primaryBadge}`}
                  title='Learn about $G4M airdrops and scoring'
                  aria-label='Learn about $G4M airdrops and scoring'
                >
                  Badge Score {formattedBadgeScore}
                </a>
              ) : (
                <Link href="/how-it-works" passHref>
                  <a
                    className={`${styles.miniBadge} ${styles.largeBadge} ${styles.primaryBadge}`}
                    title='Learn about $G4M airdrops and scoring'
                    aria-label='Learn about $G4M airdrops and scoring'
                  >
                    Badge Score {formattedBadgeScore}
                  </a>
                </Link>
              )}
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
            {description && (
              <p style={{ margin: '18px 0 16px', fontSize: 18, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{linkify(description)}</p>
            )}

            {xchAddress && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                {/* Addresses */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {rootHostForLinks ? (
                    <a
                      href={`//${rootHostForLinks}/how-it-works`}
                      className={`${styles.miniBadge} ${styles.largeBadge} ${styles.primaryBadge}`}
                      title='Learn about $G4M airdrops and scoring'
                      aria-label='Learn about $G4M airdrops and scoring'
                    >
                      Badge Score {formattedBadgeScore}
                    </a>
                  ) : (
                    <Link
                      href="/how-it-works"
                      className={`${styles.miniBadge} ${styles.largeBadge} ${styles.primaryBadge}`}
                      title='Learn about $G4M airdrops and scoring'
                      aria-label='Learn about $G4M airdrops and scoring'
                    >
                      Badge Score {formattedBadgeScore}
                    </Link>
                  )}
                  {(() => {
                    const full = xchAddress
                    const display = full.length > 20 ? `${full.slice(0,8)}...${full.slice(-8)}` : full
                    return (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'rgba(11, 181, 84, 0.12)',
                          border: '1px solid rgba(11, 181, 84, 0.35)',
                          borderRadius: 8,
                          padding: '4px 6px',
                          maxWidth: 560,
                          cursor: 'pointer'
                        }}
                        title={full}
                        role='button'
                        tabIndex={0}
                        aria-label='XCH address – click to copy'
                        onClick={handleCopy}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCopy() } }}
                      >
                        <code
                          aria-label='XCH address'
                          style={{
                            background: 'transparent',
                            padding: 0,
                            borderRadius: 0,
                            fontSize: 14,
                            lineHeight: '18px',
                            color: 'var(--color-text, #ddd)',
                            maxWidth: 520,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: '0 1 auto'
                          }}
                        >
                          {display}
                        </code>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy() }}
                          aria-label='Copy XCH address'
                          title='Copy'
                          style={{
                            cursor: 'pointer',
                            background: copiedXch ? 'var(--color-link, #0b5)' : 'transparent',
                            color: copiedXch ? '#fff' : 'var(--color-text, #eee)',
                            border: '1px solid rgba(11, 181, 84, 0.35)',
                            padding: 6,
                            width: 30,
                            height: 30,
                            fontSize: 12,
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background .15s, color .15s, border-color .15s',
                            flex: '0 0 auto'
                          }}
                        >
                          <Icon name={copiedXch ? 'check' : 'copy'} size='small' />
                        </button>
                      </div>
                    )
                  })()}

                  {didAddress && (() => {
                    const full = didAddress
                    const prefix = 'did:chia:'
                    const base = full.startsWith(prefix) ? full.slice(prefix.length) : full
                    const display = base.length > 8 ? `${prefix}${base.slice(0,4)}...${base.slice(-4)}` : `${prefix}${base}`
                    return (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'rgba(59, 130, 246, 0.12)',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          borderRadius: 8,
                          padding: '4px 6px',
                          maxWidth: 560,
                          cursor: 'pointer'
                        }}
                        title={full}
                        role='button'
                        tabIndex={0}
                        aria-label='DID address – click to copy'
                        onClick={handleCopyDid}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCopyDid() } }}
                      >
                        <code
                          aria-label='DID address'
                          style={{
                            background: 'transparent',
                            padding: 0,
                            borderRadius: 0,
                            fontSize: 14,
                            lineHeight: '18px',
                            color: 'var(--color-text, #ddd)',
                            maxWidth: 520,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: '0 1 auto'
                          }}
                        >
                          {display}
                        </code>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopyDid() }}
                          aria-label='Copy DID address'
                          title='Copy'
                          style={{
                            cursor: 'pointer',
                            background: copiedDid ? 'var(--color-link, #0b5)' : 'transparent',
                            color: copiedDid ? '#fff' : 'var(--color-text, #eee)',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                            padding: 6,
                            width: 30,
                            height: 30,
                            fontSize: 12,
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background .15s, color .15s, border-color .15s',
                            flex: '0 0 auto'
                          }}
                        >
                          <Icon name={copiedDid ? 'check' : 'copy'} size='small' />
                        </button>
                      </div>
                    )
                  })()}
                </div>
                {lastOfferId && user?.lastOfferStatus === 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      padding: '4px 6px',
                      borderRadius: 8,
                      background: 'var(--color-card-bg, #0f0f0f)',
                      border: '1px solid var(--color-border, #333)'
                    }}
                    aria-label='Get Latest Offer'
                  >
                    <span className={`${styles.miniBadge} ${styles.primaryBadge}`} style={{ userSelect: 'none' }}>Get Latest Offer</span>
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
                      <Image
                        src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                        alt="Dexie"
                        width={18}
                        height={18}
                      />
                      Dexie
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
                      <Image
                        src="https://mintgarden.io/mint-logo-round.svg"
                        alt="MintGarden"
                        width={18}
                        height={18}
                      />
                      Mintgarden
                      <Icon name='external' size='small' />
                    </Button>
                  </div>
                )}
                {(!lastOfferId || user?.lastOfferStatus !== 0) && (
                  <div className={styles.badgeRow} style={{ marginTop: 2 }}>
                    <span className={`${styles.miniBadge} ${styles.warningBadge}`}>
                      {/* If we ever enrich the user profile with queue minutes, render an ETA. */}
                      {Number.isFinite(user?.rankQueuePosition) && (user.rankQueuePosition ?? 0) > 0
                        ? `Next mint in ~${(function(mins){ const m=Math.max(0,Math.round(mins||0)); if(m>=60){const h=Math.floor(m/60),r=m%60; return r?`${h}h ${r}m`:`${h}h`; } return `${m} minute${m===1?'':'s'}`; })(user.rankQueuePosition)}`
                        : 'Next Copy Coming Soon!'}
                    </span>
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
          <div style={{ margin: '4px 0 18px', fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-subtle)', maxWidth: 1100 }}>
            {collectionTab === 'my' ? (
              <span>Send go4me PFPs to the address above and they will show up here.</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ flex: '1 1 auto' }}>These collectors own your PFP. Why not return the favor?</span>
                <div style={{ flex: '0 0 auto' }}>
                  <Button
                    size='small'
                    basic
                    color='grey'
                    onClick={exportOthersCsv}
                    loading={isExporting}
                    disabled={isExporting || (othersTotalCount || 0) === 0}
                    style={{ height: 34 }}
                    aria-label='Download XCH addresses CSV'
                    title='Download CSV of XCH addresses'
                    icon
                    labelPosition='left'
                  >
                    <Icon name='download' />
                    XCH Addresses
                  </Button>
                </div>
              </div>
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
                  const frontUrl = item.frontUrl
                  const backUrl = item.backUrl
                  return (
                    <div key={item.id} className={styles.lbCard} style={{ minHeight: 230 }}>
                      <PfpFlipThumb
                        frontUrl={frontUrl}
                        backUrl={backUrl}
                        username={item.pfpUsername}
                        profileHref={subHref || undefined}
                      />
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
                        {collectionTab === 'others' && (
                          <div className={styles.badgeRow}>
                            {item.lastOfferId && item.lastOfferStatus === 0 ? (
                              <>
                                <a
                                  href={`https://dexie.space/offers/${item.lastOfferId}`}
                                  target='_blank'
                                  rel='noreferrer noopener'
                                  className={styles.miniBadge}
                                  aria-label='View latest offer on Dexie'
                                  title='Dexie'
                                >
                                  <Image
                                    src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                                    alt="Dexie"
                                    width={16}
                                    height={16}
                                  />
                                  Dexie
                                </a>
                                <a
                                  href={`https://mintgarden.io/offers/${item.lastOfferId}`}
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
                                {Number.isFinite(item?.rankQueuePosition) && (item.rankQueuePosition ?? 0) > 0
                                  ? `Next mint in ~${(function(mins){ const m=Math.max(0,Math.round(mins||0)); if(m>=60){const h=Math.floor(m/60),r=m%60; return r?`${h}h ${r}m`:`${h}h`; } return `${m} minute${m===1?'':'s'}`; })(item.rankQueuePosition)}`
                                  : 'Next Copy Coming Soon!'}
                              </span>
                            )}
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
