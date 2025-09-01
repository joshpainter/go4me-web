// Shared site constants
export interface SiteConfig {
  name: string
  url: string
  description: string
  defaultMetaDescription: string
  logo: string
  banner: string
  twitter: string
  twitterUrl: string
  author: string
}

export const SITE_CONFIG: SiteConfig = {
  name: 'go4.me',
  url: 'https://go4.me',
  description: 'Chia NFT leaderboard and custom PFP marketplace',
  defaultMetaDescription:
    'Chia NFT leaderboard and custom PFP marketplace. Claim your free go4.me profile NFT and earn royalties when others collect it.',
  logo: 'https://go4.me/collection-icon.png',
  banner: 'https://go4.me/collection-banner.png',
  twitter: '@go4mebot',
  twitterUrl: 'https://twitter.com/go4mebot',
  author: 'go4.me',
}

// Sitemap configuration constants
export const SITEMAP_CONFIG = {
  PAGE_SIZE: 1000,
  MAX_USERS: 10000,
}
// Centralised constants for shared use across the app
// Keep these small, explicit, and documented. Prefer importing rather than re‑declaring.

// Blockchain / units
export const MOJO_PER_XCH = 1e12

// Pagination defaults (UI-facing)
export const LEADERBOARD_PAGE_SIZE = 100
export const USER_COLLECTION_PAGE_SIZE = 60

// Supabase limits
export const SUPABASE_MAX_ROWS = 1000

// Domain-specific addresses
export const MARMOT_BADGE_XCH = 'xch120ywvwahucfptkeuzzdpdz5v0nnarq5vgw94g247jd5vswkn7rls35y2gc'

// Queue processing rate: each queue position represents this many seconds of wait time
export const QUEUE_SECONDS_PER_POSITION = 10

// Leaderboard view identifiers
export const LEADERBOARD_VIEWS = {
  totalSold: 'totalSold',
  totalTraded: 'totalTraded',
  badgeScore: 'badgeScore',
  recentTrades: 'recentTrades',
  rarest: 'rarest',
  marmotRecovery: 'marmotRecovery',
  queue: 'queue',
} as const
