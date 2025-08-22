/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
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
  webpack: (config, { dev, isServer }) => {
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

      // Advanced bundle splitting for better performance
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Separate large UI libraries
          semantic: {
            test: /[\\/]node_modules[\\/]semantic-ui/,
            name: 'semantic-ui',
            chunks: 'all',
            priority: 30,
          },
          // Separate wallet libraries (heavy and not always needed)
          wallet: {
            test: /[\\/]node_modules[\\/](@walletconnect|@web3modal)/,
            name: 'wallet-libs',
            chunks: 'all',
            priority: 25,
          },
          // Separate React ecosystem
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
          // Other vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            minChunks: 2,
          },
        },
      }

      // Enable tree shaking and module concatenation
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      config.optimization.concatenateModules = true

      // Optimize module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use ES modules for better tree shaking
        'semantic-ui-react': 'semantic-ui-react/dist/es',
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
    '*.go4.fail'
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
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://platform.twitter.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' data: blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://verify.walletconnect.com https://walletconnect.com https://walletconnect.org https://platform.twitter.com",
              "connect-src 'self' https: wss: data: blob:",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      }
    ]
  },
  images: {
    // Cache optimized images on the CDN for a long time (in seconds)
    // These avatars and PFP thumbnails are immutable, so a 1-year TTL is safe
    minimumCacheTTL: 31536000,
    // Enable modern image formats for better compression
    formats: ['image/webp', 'image/avif'],
    // Define responsive image sizes for better performance
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Modern remotePatterns configuration for Next.js 14
    remotePatterns: [
      { protocol: 'https', hostname: 'go4me-pfps.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'go4me-domains.s3.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'can.seedsn.app', pathname: '/**' },
      { protocol: 'https', hostname: 'go4.me', pathname: '/**' },
      { protocol: 'https', hostname: 'go4.fail', pathname: '/**' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'mintgarden.io', pathname: '/**' },
      { protocol: 'https', hostname: 'assets.mainnet.mintgarden.io', pathname: '/**' },
      { protocol: 'https', hostname: 'nft.dexie.space', pathname: '/**' }
    ]
  }
}

module.exports = nextConfig
