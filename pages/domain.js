import Head from 'next/head'
import styles from '../styles/Home.module.css'

export async function getServerSideProps(ctx) {
  const { req, query } = ctx
  const pfpFromQuery = (query.pfp || '').toString().trim()
  let sub = pfpFromQuery
  if (!sub) {
    // Derive from host header if reaching /domain directly
    const hostHeader = req.headers.host || ''
    const host = hostHeader.split(':')[0]
    const normalized = host === '127.0.0.1' ? 'localhost' : host
    if (normalized.endsWith('.go4.me') || normalized.endsWith('.localhost')) {
      sub = normalized.split('.')[0]
    }
  }
  // If no subdomain resolved, return 404 (domain page only for subdomains)
  if (!sub) {
    return { notFound: true }
  }
  // Basic validation: allow alphanum underscore dash
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(sub)) {
    return { notFound: true }
  }
  return { props: { pfp: sub } }
}

export default function DomainPage({ pfp }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>{pfp}.go4.me</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h1 className={styles.title}>
          go4.me / {pfp}
        </h1>
        <p style={{ marginTop: 24 }}>User landing content coming soon.</p>
      </main>
      <footer className={styles.footer}>
      </footer>
    </div>
  )
}
