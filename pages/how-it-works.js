import Head from 'next/head'
import Image from 'next/image'
import { Button, Icon } from 'semantic-ui-react'
import { useState } from 'react'
import styles from '../styles/Home.module.css'
import { useTheme } from './_app'

export async function getServerSideProps(context) {
  // Derive root host (without subdomain) + preserve port so we can build absolute-ish links
  const hostHeader = context.req?.headers?.host || ''
  const [hostNoPort, portPart] = hostHeader.split(':')
  let rootDomain = hostNoPort
  if (hostNoPort && hostNoPort !== 'localhost' && hostNoPort !== '127.0.0.1') {
    const parts = hostNoPort.split('.')
    if (parts.length >= 2) rootDomain = parts.slice(-2).join('.')
  } else if (hostNoPort === '127.0.0.1') {
    rootDomain = 'localhost'
  }
  const rootHostForLinks = portPart ? `${rootDomain}:${portPart}` : rootDomain
  return { props: { rootHostForLinks } }
}

export default function HowItWorks({ rootHostForLinks }) {
  const { theme, toggleTheme } = useTheme()
  const [copiedAsset, setCopiedAsset] = useState(false)
  const G4M_ASSET_ID = '37b231bbdc0002a4fbbb65de0007a9cf1645a292888711968a8abb9a3e40596e'

  const handleCopyAsset = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(G4M_ASSET_ID)
      } else {
        const ta = document.createElement('textarea')
        ta.value = G4M_ASSET_ID
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedAsset(true)
      setTimeout(() => setCopiedAsset(false), 1600)
    } catch (_) {
      // no-op
    }
  }
  return (
    <div className={styles.container}>
      <Head>
        <title>How it works • go4.me</title>
        <link rel="icon" href="/collection-icon.png" />
      </Head>

      {/* Sticky top bar (no search, includes back link) */}
      <div className={styles.stickyTopbar}>
        {/* Left: back to leaderboard */}
        <a href={`//${rootHostForLinks}/`} aria-label="Back to leaderboard home" className={styles.topNavLink}>
          ← Back to Leaderboard
        </a>
        <div style={{ flex: 1 }} />
        {/* Right: theme toggle */}
        <div className={styles.topNavActions}>
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

      <main>
        <div style={{ paddingTop: 84 }} />
        {/* Centered collection logo like home page */}
        <div style={{ width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Image
            src="/collection-icon.png"
            alt="go4.me collection icon"
            width={160}
            height={160}
            style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.28))' }}
            priority
          />
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 40px' }}>
          <h1 style={{ textAlign: 'center', marginBottom: 12 }}>How does it work?</h1>
          <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>Everything you need to know to start with go4.me</p>

          <section style={{ marginTop: 28 }}>
            <h3>Claiming your go4.me PFP</h3>
            <p>
              To get started, share your XCH address and tag @go4mebot on X. We’ll generate your custom go4.me PFP and publish it so others can collect it.
              You’ll earn royalties whenever your editions are traded.
            </p>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3>Royalties and editions</h3>
            <p>
              Each time an edition of your PFP is sold, a portion of the sale is paid back to you as a royalty. The leaderboard shows the total editions sold, total traded value, and other stats.
            </p>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3>Badge Score and $G4M airdrops</h3>
            <p>
              Your Badge Score reflects your engagement and collection activity. Higher scores can help with airdrops and featured placements.
            </p>
            <p>
              Make sure all your collected go4me PFPs are at the XCH address that you used when you registered. If your PFPs show up on your go4me page, you are all set! If they don&apos;t, transfer them to the XCH address at the top of your go4me page and wait for them to show up. This usually doesn&apos;t take longer than 10 minutes.
            </p>
            <p>Your airdrop amount is calculated using the Rarity Badge for each PFP you&apos;ve collected. The Rarity Badge (lower‑left of each PFP) is worth:</p>
            <ul>
              <li>Crown: 100 $G4M</li>
              <li>Diamond: 90 $G4M</li>
              <li>Lucky Hat: 80 $G4M</li>
              <li>Rocket: 70 $G4M</li>
              <li>Snorkel: 60 $G4M</li>
              <li>Fireball: 50 $G4M</li>
              <li>Moon: 40 $G4M</li>
              <li>Basketball: 30 $G4M</li>
              <li>Tractor: 20 $G4M</li>
              <li>Seedling: 10 $G4M</li>
            </ul>
            <p>
              Your total score will be calculated and sent to your XCH address.
            </p>
            <p>
              What can you do with $G4M? Collect more go4me PFPs, of course! 
            </p>
          </section>

          <section style={{ marginTop: 24}}>
            <h3>Expiring Offers and Decreasing Prices</h3>
            <p>
              If a PFP offer for XCH expires after 7 days, it will be regenerated as a $G4M offer. If that offer also expires after another 7 days, it will be regenerated as a slightly cheaper $G4M offer. It will continue decreasing in price every 7 days until sold or until it reaches 200 $G4M, at which point it will not go lower.
            </p>
            <p>
              Once sold, the next edition will be generated and offered for the normal XCH price again for 7 days, and the cycle will repeat. And don&apos;t forget: you still get 10% royalty on every sale, including $G4M tokens!
            </p>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3>Official $G4M Asset ID</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <code
                title={G4M_ASSET_ID}
                style={{
                  background: 'var(--color-card-bg, #111)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 14,
                  lineHeight: '18px',
                  color: '#bbb',
                  maxWidth: 620,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: '0 1 auto'
                }}
                aria-label='$G4M asset ID'
              >
                {G4M_ASSET_ID}
              </code>
              <button
                onClick={handleCopyAsset}
                aria-label='Copy $G4M asset ID'
                style={{
                  cursor: 'pointer',
                  background: copiedAsset ? 'var(--color-link, #0b5)' : 'var(--color-card-bg, #1b1b1b)',
                  color: copiedAsset ? '#fff' : 'var(--color-text, #eee)',
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
                {copiedAsset ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                as='a'
                href='https://dexie.space/offers/any/G4M'
                target='_blank'
                rel='noreferrer'
                size='tiny'
                basic
                color='blue'
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                aria-label='View $G4M offers on Dexie'
                title='Dexie'
              >
                View $G4M offers on Dexie
                <Image
                  src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                  alt="Dexie"
                  width={18}
                  height={18}
                />
                <Icon name='external' size='small' />
              </Button>
            </div>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3>Trading on marketplaces</h3>
            <p>
              You can view and exchange offers on third‑party marketplaces like Dexie and Mintgarden. Look for the badges and links under each card on the leaderboard.
            </p>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                as='a'
                href='https://dexie.space/offers/col15qqmhl9gmra3h07av2mcpqpqqza92n33xvcu35gahgzzhy96j2ls6faz5t/any'
                target='_blank'
                rel='noreferrer'
                size='tiny'
                basic
                color='blue'
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}
                aria-label='View go4.me PFP offers on Dexie'
                title='Dexie'
              >
                View go4.me PFP offers on Dexie
                <Image
                  src="https://raw.githubusercontent.com/dexie-space/dexie-kit/main/svg/duck.svg"
                  alt="Dexie"
                  width={18}
                  height={18}
                />
                <Icon name='external' size='small' />
              </Button>
            </div>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3>FAQs</h3>
            <p>
              Have questions about minting, royalties, or eligibility? We’ll expand this page with detailed guidance. For now, reach out on X and we’ll help you get set up.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
