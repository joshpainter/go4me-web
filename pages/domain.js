import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useState } from 'react'
import { Button, Icon } from 'semantic-ui-react'

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

  let user = null
  let ownedPfps = []
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
          .limit(100) // arbitrary cap to prevent huge payloads
        if (ownedError) throw ownedError
        if (Array.isArray(ownedData)) {
          ownedPfps = ownedData.map((r, idx) => {
            const image = r.thumbnail_uri
            const label = r.name
            return {
              id: r.nft_id,
              image,
              label
            }
          })
        }
      } catch (ownedErr) {
        console.warn('Owned PFP fetch failed (non-fatal)', ownedErr)
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

  return { props: { user, ownedPfps, rootHostForLinks } }
}

export default function DomainPage({ user, ownedPfps = [], rootHostForLinks }) {
  const { username, fullName, description, avatarUrl, xchAddress, lastOfferId } = user
  const [copied, setCopied] = useState(false)

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
              <p style={{ margin: '18px 0 16px', fontSize: 18, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{description}</p>
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
        {/* Owned PFP Grid */}
        <div style={{ marginTop: 48, width: '100%', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={{ textAlign: 'center', margin: '0 0 20px', fontSize: 28 }}>Owned PFPs</h2>
          {ownedPfps.length > 0 ? (
            <div className={styles.lbGrid} style={{ alignItems: 'stretch' }}>
              {ownedPfps.map(item => (
                <div key={item.id} className={styles.lbCard} style={{ minHeight: 220 }}>
                  <div className={styles.cardImgWrap}>
                    <Image src={item.image} alt={item.label} layout='fill' objectFit='cover' />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.username} style={{ fontSize: 13 }} title={item.label}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', opacity: 0.55, fontSize: 14 }}>No owned PFPs to display yet.</div>
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
