/**
 * TypeScript types for Supabase database schemas
 * Centralised type definitions for all database operations
 */

// Base response types
export interface DatabaseResponse<T> {
  data: T | null
  error: DatabaseError | null
  count?: number
}

export interface DatabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

// Pagination and filtering types
export interface PaginationOptions {
  from: number
  to: number
}

export interface SearchOptions {
  query?: string
  caseSensitive?: boolean
}

export interface OrderOptions {
  column: string
  ascending: boolean
}

// User-related types
export interface UserProfile {
  username: string
  name?: string
  description?: string
  pfp_ipfs_cid?: string
  xch_address?: string
  did_address?: string | null
  last_offerid?: string
  last_offer_status?: number | null
  pfp_update_requested_at?: string | null
  total_badge_score?: number
  rank_copies_sold?: number | null
  rank_queue_position?: number | null
}

export interface LeaderboardUser {
  username: string
  name?: string
  pfp_ipfs_cid?: string
  total_sold?: number
  total_traded_value?: number
  total_royalties_value?: number
  average_sale_value?: number
  avg_time_to_sell_ms?: number
  rank_copies_sold?: number
  rank_total_traded_value?: number
  rank_total_badge_score?: number
  rank_last_sale?: number
  rank_fewest_copies_sold?: number
  // Display formatted fields
  displayTotalTradedXCH?: string
  displayTotalRoyaltiesXCH?: string
  displayAverageSaleXCH?: string
  displayAvgTime?: string
}

export interface QueueUser {
  username: string
  name?: string
  pfp_ipfs_cid?: string
  rank_queue_position?: number
}

// NFT-related types
export interface UserOwnedPfp {
  username: string
  pfp_username: string
  pfp_name?: string
  pfp_ipfs_cid?: string
  // Additional fields as needed
}

export interface UserOtherOwner {
  username: string
  pfp_username: string
  pfp_name?: string
  pfp_ipfs_cid?: string
  // Additional fields as needed
}

// Service response types with loading states
export interface ServiceResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
  count?: number
}

// Query parameter types
export interface LeaderboardQuery {
  view: 'totalSold' | 'totalTraded' | 'badgeScore' | 'recentTrades' | 'rarest' | 'marmotRecovery' | 'queue'
  query?: string
  pagination: PaginationOptions
}

export interface UserProfileQuery {
  username: string
  searchQuery?: string
}

export interface UserPfpsQuery {
  username: string
  type: 'owned' | 'others'
  query?: string
  pagination: PaginationOptions
}

// Constants
export const LEADERBOARD_VIEWS = {
  totalSold: 'totalSold',
  totalTraded: 'totalTraded',
  badgeScore: 'badgeScore',
  recentTrades: 'recentTrades',
  rarest: 'rarest',
  marmotRecovery: 'marmotRecovery',
  queue: 'queue',
} as const

export type LeaderboardView = keyof typeof LEADERBOARD_VIEWS
