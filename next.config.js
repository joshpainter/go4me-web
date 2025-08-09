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
      'raw.githubusercontent.com',
      'mintgarden.io'
    ],
    // Keep remotePatterns (ignored in older versions but future proof if upgraded)
    remotePatterns: [
      { protocol: 'https', hostname: 'go4me-pfps.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'go4me-domains.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'can.seedsn.app', pathname: '/**' },
      { protocol: 'https', hostname: 'go4.me', pathname: '/**' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'mintgarden.io', pathname: '/**' }
    ]
  }
}

module.exports = nextConfig
