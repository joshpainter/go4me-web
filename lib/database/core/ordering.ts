// Centralized ordering configuration for leaderboard views
// We use a single server-side ordering map. There is no UI to change the
// client-side sort strategy, so we always rely on the precomputed rank_* columns
// for fast, stable, deterministic ordering across initial load and pagination.

export interface OrderSpec {
  column: string
  ascending: boolean
}

export const ORDER_MAP: Record<string, OrderSpec> = {
  totalSold: { column: 'rank_copies_sold', ascending: true },
  totalTraded: { column: 'rank_total_traded_value', ascending: true },
  badgeScore: { column: 'rank_total_badge_score', ascending: true },
  shadowScore: { column: 'rank_total_shadow_score', ascending: true },
  recentTrades: { column: 'rank_last_sale', ascending: true },
  rarest: { column: 'rank_fewest_copies_sold', ascending: true },
  marmotRecovery: { column: 'rank_copies_sold', ascending: true },
}
