import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Icon, Menu } from 'semantic-ui-react'

export async function getServerSideProps(ctx) {
  const { req, query } = ctx
  let username = (query.pfp || query.username || '').toString().trim()

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
          avatarUrl: row.generated_pfp_url || row.avatar_url || '',
          xchAddress: row.xch_address || '',
          lastOfferId: row.last_offerid || row.last_offer_id || null,
        }
      }

      // Attempt to load owned PFP NFTs (best-effort; swallow errors so profile still renders)
      try {
        const { data: ownedData, error: ownedError } = await supabase
          .from('get_user_page_owned_pfps')
          .select('*')
          .ilike('username', username)
          .range(0, PAGE_SIZE - 1)
        if (ownedError) throw ownedError
        if (Array.isArray(ownedData)) {
          ownedPfps = ownedData.map((r, idx) => {
            const image = r.thumbnail_uri || r.image_url || r.generated_pfp_url
            return {
              id: r.nft_id || r.id || `owned-${idx}`,
              image,
              pfpName: r.pfp_name || r.name || `#${r.nft_id || idx + 1}`,
              pfpUsername: r.pfp_username || r.username || null
            }
          })
          ownedHasMore = ownedData.length === PAGE_SIZE
        }
      } catch (ownedErr) {
        console.warn('Owned PFP fetch failed (non-fatal)', ownedErr)
      }

      // Attempt to load other owners collection (same shape)
      try {
        const { data: othersData, error: othersError } = await supabase
          .from('get_user_page_other_owners')
          .select('*')
          .ilike('username', username)
          .range(0, PAGE_SIZE - 1)
        if (othersError) throw othersError
        if (Array.isArray(othersData)) {
          otherOwners = othersData.map((r, idx) => {
            const image = r.thumbnail_uri || ''
            return {
              id: r.nft_id || r.id || `other-${idx}`,
              image,
              pfpName: r.pfp_name || r.name || `#${r.nft_id || idx + 1}`,
              pfpUsername: r.pfp_username || r.username || null
            }
          })
          othersHasMore = othersData.length === PAGE_SIZE
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

  return { props: { user, ownedPfps, otherOwners, ownedHasMore, othersHasMore, pageSize: PAGE_SIZE, rootHostForLinks } }
}

export default function DomainPage({ user, ownedPfps = [], otherOwners = [], ownedHasMore = false, othersHasMore = false, pageSize = 60, rootHostForLinks }) {
  const { username, fullName, description, avatarUrl, xchAddress, lastOfferId } = user
  const [copied, setCopied] = useState(false)
  const [collectionTab, setCollectionTab] = useState('my') // 'my' | 'others'
  // Infinite scroll state
  const [ownedList, setOwnedList] = useState(() => ownedPfps)
  const [ownedPage, setOwnedPage] = useState(1) // next page index (0 preloaded)
  const [ownedMore, setOwnedMore] = useState(ownedHasMore)
  const [othersList, setOthersList] = useState(() => otherOwners)
  const [othersPage, setOthersPage] = useState(1)
  const [othersMore, setOthersMore] = useState(othersHasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const [intersectionSupported, setIntersectionSupported] = useState(true)

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
      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .ilike('username', username)
        .range(from, to)
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
      nodes.push(
        <a key={`u-${start}`} href={href} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--color-link, #3aa0ff)' }}>
          {url}
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
      <main className={styles.main} style={{ justifyContent: 'flex-start' }}>
  <div style={{ display: 'flex', flexDirection: 'row', gap: 40, alignItems: 'flex-start', flexWrap: 'nowrap', marginTop: '2rem', justifyContent: 'center', marginLeft: 'auto', marginRight: 'auto', maxWidth: 1000 }}>
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <a
              href={avatarUrl || '#'}
              target={avatarUrl ? '_blank' : undefined}
              rel="noreferrer noopener"
              aria-label={avatarUrl ? `Open full-size avatar for ${username}` : undefined}
              style={{ position: 'relative', width: 225, height: 225, display: 'block' }}
            >
              <Image src={avatarUrl} alt={`${username} avatar`} layout='fill' objectFit='cover' />
            </a>
          </div>
          <div style={{ flex: '1 1 0', minWidth: 320, textAlign: 'left', maxWidth: 520, minHeight: 170, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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

          </div>
        </div>
        {xchAddress && (
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'stretch', justifyContent: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', maxWidth: 1100, padding: '0 20px', textAlign: 'center' }}>
              {lastOfferId && (
                <div style={{ display: 'flex', gap: 10, flex: '0 0 auto' }}>
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
                    <Icon name='external' size='small' />
                  </Button>
                </div>
              )}
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
          </div>
        )}
        {/* Collection Tabs */}
        <div style={{ marginTop: 48, width: '100%', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
          <Menu secondary pointing style={{ marginBottom: 10 }}>
            <Menu.Item
              name='My Collection'
              active={collectionTab === 'my'}
              onClick={() => setCollectionTab('my')}
            />
            <Menu.Item
              name='Other Owners'
              active={collectionTab === 'others'}
              onClick={() => setCollectionTab('others')}
            />
          </Menu>
          <div style={{ margin: '4px 0 18px', fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-subtle)', maxWidth: 760 }}>
            {collectionTab === 'my' ? (
              <span>Send go4me PFPs to the address above and they will show up here.</span>
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
      <footer className={styles.footer}>
        {rootHostForLinks ? (
          <a href={`//${rootHostForLinks}/`} aria-label="Back to leaderboard home" style={{ fontSize: 14, textDecoration: 'none' }}>
            ← Back to Leaderboard
          </a>
        ) : (
          <Link href="/" aria-label="Back to leaderboard home" style={{ fontSize: 14, textDecoration: 'none' }}>
            ← Back to Leaderboard
          </Link>
        )}
      </footer>
    </div>
  )
}
