import type { NextConfig } from 'next'

// Use TypeScript for better IntelliSense and safety. Extra custom fields are preserved.
const nextConfig = {
  reactStrictMode: true,
  // Only treat TypeScript files as pages to avoid duplicate routes during migration
  pageExtensions: ['ts', 'tsx'],

  // Production optimizations
  compress: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  generateEtags: false,

  // Modern browser targeting - reduces bundle size by avoiding unnecessary transpilation
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Optimize JavaScript loading
  experimental: {
    // optimizeCss: true, // Requires critters package - disabled for now
  },

  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),

  // Webpack optimizations
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    // Development optimizations
    if (dev) {
      config.optimization.removeAvailableModules = false
      config.optimization.removeEmptyChunks = false
      config.optimization.splitChunks = false
    }

    if (!dev && !isServer) {
      // Target modern browsers to reduce transpilation
      config.target = ['web', 'es2020']

      // Optimize for modern browsers
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use modern versions of polyfills
        'core-js/stable': 'core-js/es',
      }

      // Production bundle splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    return config
  },

  // Allow cross-origin requests from subdomains during development
  allowedDevOrigins: [
    'localhost',
    '*.localhost',
    'localhost:3000',
    '*.localhost:3000',
    'go4.me',
    '*.go4.me',
    'go4.fail',
    '*.go4.fail',
  ],

  async headers() {
    return [
      {
        source: '/collection-icon.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/collection-banner.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },

  images: {
    // Cache optimized images on the CDN for a long time (in seconds)
    // These avatars and PFP thumbnails are immutable, so a 1-year TTL is safe
    minimumCacheTTL: 31536000,
    // Modern remotePatterns configuration for Next.js 14+
    remotePatterns: [
      { protocol: 'https', hostname: 'go4me-pfps.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'go4me-domains.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'can.seedsn.app', pathname: '/**' },
      { protocol: 'https', hostname: 'go4.me', pathname: '/**' },
      { protocol: 'https', hostname: 'go4.fail', pathname: '/**' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'mintgarden.io', pathname: '/**' },
      { protocol: 'https', hostname: 'assets.mainnet.mintgarden.io', pathname: '/**' },
    ],
  },
} satisfies NextConfig & { allowedDevOrigins: string[] }

export default nextConfig
