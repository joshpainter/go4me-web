import Head from 'next/head'
import Image from 'next/image'
import { Button, Icon } from 'semantic-ui-react'
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
            <h3>Badge Score</h3>
            <p>
              Your Badge Score reflects your engagement and collection activity. Higher scores can help with airdrops and featured placements.
            </p>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3>Trading on marketplaces</h3>
            <p>
              You can view and exchange offers on third‑party marketplaces like Dexie and Mintgarden. Look for the badges and links under each card on the leaderboard.
            </p>
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
