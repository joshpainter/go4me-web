/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  // Allow cross-origin requests from subdomains during development
  allowedDevOrigins: [
    'localhost',
    '*.localhost',
    'localhost:3000',
    '*.localhost:3000',
    'go4.me',
    '*.go4.me'
  ],
  async headers() {
    return [
      {
        source: '/collection-icon.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        source: '/collection-banner.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      }
    ]
  },
  images: {
    // Cache optimized images on the CDN for a long time (in seconds)
    // These avatars and PFP thumbnails are immutable, so a 1-year TTL is safe
    minimumCacheTTL: 31536000,
    // Modern remotePatterns configuration for Next.js 14
    remotePatterns: [
      { protocol: 'https', hostname: 'go4me-pfps.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'go4me-domains.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'can.seedsn.app', pathname: '/**' },
      { protocol: 'https', hostname: 'go4.me', pathname: '/**' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'mintgarden.io', pathname: '/**' },
      { protocol: 'https', hostname: 'assets.mainnet.mintgarden.io', pathname: '/**' }
    ]
  }
}

module.exports = nextConfig
