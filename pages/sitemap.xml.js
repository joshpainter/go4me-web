import { getSupabaseClient } from '../lib/supabaseClient'
import { SITE_CONFIG, SITEMAP_CONFIG } from '../lib/constants'

function generateSiteMap(users) {
  const baseUrl = SITE_CONFIG.url
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/how-it-works</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Leaderboard views -->
  <url>
    <loc>${baseUrl}/?view=totalSold</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/?view=totalTraded</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/?view=badgeScore</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/?view=rarest</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/?view=recentTrades</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/?view=queue</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- User profile pages -->
  ${users
    .map((user) => {
      if (!user.username) return ''
      return `
  <url>
    <loc>https://${user.username}.${SITE_CONFIG.url.replace('https://', '')}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    })
    .join('')}
</urlset>`
}

export async function getServerSideProps({ res }) {
  const supabase = getSupabaseClient()
  
  try {
    // Page through users to include all profile pages without exceeding limits
    const { PAGE_SIZE, MAX_USERS } = SITEMAP_CONFIG
    let page = 0
    const users = []

    while (users.length < MAX_USERS) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('get_leaderboard')
        .select('username')
        .not('username', 'is', null)
        .order('username', { ascending: true }) // ensure deterministic paging
        .range(from, to)

      if (error) throw error

      if (!data || data.length === 0) break

      users.push(...data)

      // Break when the last page is smaller than PAGE_SIZE (no more data)
      if (data.length < PAGE_SIZE) break
      page += 1
    }
    
    // Generate the XML sitemap
    const sitemap = generateSiteMap(users || [])
    
    res.setHeader('Content-Type', 'text/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate') // Cache for 24 hours
    res.write(sitemap)
    res.end()
    
    return { props: {} }
  } catch (error) {
    console.error('Error generating sitemap:', error)
    
    // Fallback to basic sitemap
    const basicSitemap = generateSiteMap([])
    res.setHeader('Content-Type', 'text/xml')
    res.write(basicSitemap)
    res.end()
    
    return { props: {} }
  }
}

export default function Sitemap() {
  // This component will never render because we handle the response in getServerSideProps
  return null
}
