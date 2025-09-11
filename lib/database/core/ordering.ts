// Centralized ordering configuration for leaderboard views

export interface OrderSpec {
  column: string
  ascending: boolean
}

export const ORDER_MAP_INITIAL: Record<string, OrderSpec> = {
  totalSold: { column: 'rank_copies_sold', ascending: true },
  totalTraded: { column: 'rank_total_traded_value', ascending: true },
  badgeScore: { column: 'rank_total_badge_score', ascending: true },
  shadowScore: { column: 'rank_total_shadow_score', ascending: true },
  recentTrades: { column: 'rank_last_sale', ascending: true },
  rarest: { column: 'rank_fewest_copies_sold', ascending: true },
  marmotRecovery: { column: 'rank_copies_sold', ascending: true },
}

export const ORDER_MAP_PAGE: Record<string, OrderSpec> = {
  totalSold: { column: 'total_sold', ascending: false },
  totalTraded: { column: 'total_traded_value', ascending: false },
  badgeScore: { column: 'rank_total_badge_score', ascending: true },
  shadowScore: { column: 'rank_total_shadow_score', ascending: true },
  recentTrades: { column: 'rank_last_sale', ascending: true },
  rarest: { column: 'rank_fewest_copies_sold', ascending: true },
  marmotRecovery: { column: 'total_sold', ascending: false },
}
