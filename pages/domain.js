import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { getSupabaseClient } from '../lib/supabaseClient'

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
  try {
    const supabase = getSupabaseClient()
    if (supabase) {
      // Reuse leaderboard source so stats align with home page
      const { data, error } = await supabase
        .from('get_user_page_info')
        .select('*')
        .eq('username', username)
        .limit(1)
      if (error) throw error
      if (data && data.length > 0) {
        const row = data[0]
        user = {
          username: row.username,
          fullName: row.name || '',
          description: row.description || '',
          avatarUrl: row.generated_pfp_url || ''
        }
      }
    }
  } catch (e) {
    console.error('Failed to load user profile', e)
  }

  if (!user) return { notFound: true }

  return { props: { user } }
}

export default function DomainPage({ user }) {
  const { username, fullName, description, avatarUrl } = user
  return (
    <div className={styles.container}>
      <Head>
        <title>{username}.go4.me</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main} style={{ justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 40, alignItems: 'center', flexWrap: 'wrap', marginTop: '2rem', justifyContent: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ position: 'relative', width: 225, height: 225, borderRadius: '50%', overflow: 'hidden', flex: '0 0 auto' }}>
            <Image src={avatarUrl} alt={`${username} avatar`} layout='fill' objectFit='cover' />
          </div>
          <div style={{ flex: '1 1 340px', minWidth: 280, textAlign: 'left', maxWidth: 480 }}>
            <h1 style={{ margin: 0, fontSize: 48, lineHeight: 1.05 }}>{fullName}</h1>
            <div style={{ fontWeight: 400, fontSize: 24, color: '#888', marginTop: 6 }}>@{username}</div>
            {description && (
              <p style={{ margin: '18px 0 16px', fontSize: 18, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{description}</p>
            )}
          </div>
        </div>
        <div style={{ marginTop: 40, width: '100%', textAlign: 'center', opacity: 0.6 }}>
          <p>More profile stats & collectibles coming soon.</p>
        </div>
      </main>
      <footer className={styles.footer}>
      </footer>
    </div>
  )
}
