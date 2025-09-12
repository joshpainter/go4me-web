import { MOJO_PER_XCH, QUEUE_SECONDS_PER_POSITION } from '../../constants'
import type { Tables } from '../database.types'

export type HomeUser = {
  id: string
  username: string
  fullName: string | null
  avatarUrl: string
  xPfpUrl: string
  totalSold: number
  totalTradedXCH?: number
  totalRoyaltiesXCH?: number
  averageSaleXCH?: number
  lastOfferId?: string | null
  lastOfferStatus?: number | null
  lastSaleAtMs?: number | null
  rankCopiesSold?: number | null
  rankFewestCopiesSold?: number | null
  rankTotalTradedValue?: number | null
  rankLastSale?: number | null
  rankTotalBadgeScore?: number | null
  rankTotalShadowScore?: number | null
  rankQueuePosition?: number | null
  timeToNextMintSeconds?: number
  estimatedNextMintAtMs?: number
  totalBadgeScore: number
  totalShadowScore: number
  displayTotalTradedXCH?: string
  displayTotalRoyaltiesXCH?: string
}

export type LeaderboardRow = Tables<'get_leaderboard'>

export function buildPfpUrl(pfpCid?: string | null, username?: string | null, variant: 'go4me' | 'x' = 'go4me') {
  if (pfpCid && username) {
    const suffix = variant === 'x' ? `${username}-x.png` : `${username}-go4me.png`
    return `https://can.seedsn.app/ipfs/${pfpCid}/${suffix}`
  }
  return '/collection-icon.png'
}

export function mapLeaderboardRowToHomeUser(row: LeaderboardRow): HomeUser {
  const id = row.author_id || row.username || ''
  const username = row.username || ''
  const totalSalesAmount = row.xch_total_sales_amount ?? 0
  const avgSalesAmount = row.xch_average_sales_amount ?? 0

  const totalTradedXCH = totalSalesAmount / MOJO_PER_XCH
  const totalRoyaltiesXCH = totalTradedXCH * 0.1
  const averageSaleXCH = avgSalesAmount / MOJO_PER_XCH

  const rankQueuePosition = row.rank_queue_position ?? null
  const timeToNextMintSeconds = Math.max(0, Math.round((rankQueuePosition || 0) * QUEUE_SECONDS_PER_POSITION))
  const estimatedNextMintAtMs = Date.now() + timeToNextMintSeconds * 1000

  return {
    id,
    username,
    fullName: row.name || null,
    avatarUrl: buildPfpUrl(row.pfp_ipfs_cid, username, 'go4me'),
    xPfpUrl: buildPfpUrl(row.pfp_ipfs_cid, username, 'x'),
    totalSold: row.total_sold ?? 0,
    totalTradedXCH,
    totalRoyaltiesXCH,
    averageSaleXCH,
    lastOfferId: row.last_offerid,
    lastOfferStatus: row.last_offer_status,
    lastSaleAtMs: row.last_sale_at ? new Date(row.last_sale_at).getTime() : null,
    rankCopiesSold: row.rank_copies_sold,
    rankFewestCopiesSold: row.rank_fewest_copies_sold,
    rankTotalTradedValue: row.rank_total_traded_value,
    rankLastSale: row.rank_last_sale,
    rankTotalBadgeScore: row.rank_total_badge_score,
    rankTotalShadowScore: row.rank_total_shadow_score,
    rankQueuePosition,
    timeToNextMintSeconds,
    estimatedNextMintAtMs,
    totalBadgeScore: row.total_badge_score || 0,
    totalShadowScore: row.total_shadow_score || 0,
  }
}
