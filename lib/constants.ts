// Centralised constants for shared use across the app
// Keep these small, explicit, and documented. Prefer importing rather than re‑declaring.

// Blockchain / units
export const MOJO_PER_XCH = 1e12

// Pagination defaults (UI-facing)
export const LEADERBOARD_PAGE_SIZE = 100
export const USER_COLLECTION_PAGE_SIZE = 60

// Sitemap generation
export const SITEMAP_PAGE_SIZE = 1000
export const SITEMAP_MAX_USERS = 10000

// Supabase limits
export const SUPABASE_MAX_ROWS = 1000

// Domain-specific addresses
export const MARMOT_BADGE_XCH = 'xch120ywvwahucfptkeuzzdpdz5v0nnarq5vgw94g247jd5vswkn7rls35y2gc'

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

