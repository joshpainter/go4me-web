/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Explicit domains list for Next 12.x compatibility
    domains: [
      'go4me-pfps.s3.amazonaws.com',
      'go4me-domains.s3.amazonaws.com',
  'can.seedsn.app',
  'go4.me',
  'raw.githubusercontent.com'
    ],
    // Keep remotePatterns (ignored in older versions but future proof if upgraded)
    remotePatterns: [
      { protocol: 'https', hostname: 'go4me-pfps.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'go4me-domains.s3.amazonaws.com', pathname: '/**' },
  { protocol: 'https', hostname: 'can.seedsn.app', pathname: '/**' },
  { protocol: 'https', hostname: 'go4.me', pathname: '/**' },
  { protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/**' }
    ]
  },
  rewrites: async () => {
    return [
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: '(?<pfpname>.*)(\.go4\.me|\.localhost)'
          }
        ],
        destination: '/domain',
      },      
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: '(go4\.me|localhost)'
          }
        ],
        destination: '/home',
      },         
      {
        source: '/go4me0001.png',
        has: [
          {
            type: 'host',
            value: '(?<pfpname>.*)(\.go4\.me|\.localhost)'
          }
        ],
        destination: 'https://go4me-pfps.s3.amazonaws.com/go4me0001-:pfpname.png',
      },
      {
        source: '/domain.json',
        has: [
          {
            type: 'host',
            value: '(?<pfpname>.*)(\.go4\.me|\.localhost)'
          }
        ],        
        destination: 'https://go4me-domains.s3.amazonaws.com/:pfpname.json',
      },      
    ]
  },
}

module.exports = nextConfig
