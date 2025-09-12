// @ts-nocheck
import { fetchUsernamesPage } from '../lib/database/services/sitemap'
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
  try {
    const { PAGE_SIZE, MAX_USERS } = SITEMAP_CONFIG
    let page = 0
    const users = []
    while (users.length < MAX_USERS) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error } = await fetchUsernamesPage({ from, to })
      if (error) throw new Error(error.message)
      const rows = data || []
      if (rows.length === 0) break
      users.push(...rows)
      if (rows.length < PAGE_SIZE) break
      page += 1
    }
    const sitemap = generateSiteMap(users || [])
    res.setHeader('Content-Type', 'text/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate')
    res.write(sitemap)
    res.end()
    return { props: {} }
  } catch (error) {
    console.error('Error generating sitemap:', error)
    const basicSitemap = generateSiteMap([])
    res.setHeader('Content-Type', 'text/xml')
    res.write(basicSitemap)
    res.end()
    return { props: {} }
  }
}

export default function Sitemap() {
  return null
}
