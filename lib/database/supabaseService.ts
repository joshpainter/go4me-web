/* Centralised Supabase database service
 * Provides reusable, typed functions for all database operations.
 * Follows existing project patterns and consolidates error handling.
 */
import { getSupabaseClient } from './supabaseClient'
import type { DatabaseResponse, LeaderboardView, PaginationOptions, UserProfile } from './types'
import { SUPABASE_MAX_ROWS, MARMOT_BADGE_XCH } from '../constants'

// Ordering specifications mirror existing UI logic
const ORDER_MAP_INITIAL: Record<string, { column: string; ascending: boolean }> = {
  totalSold: { column: 'rank_copies_sold', ascending: true },
  totalTraded: { column: 'rank_total_traded_value', ascending: true },
  badgeScore: { column: 'rank_total_badge_score', ascending: true },
  recentTrades: { column: 'rank_last_sale', ascending: true },
  rarest: { column: 'rank_fewest_copies_sold', ascending: true },
  marmotRecovery: { column: 'rank_copies_sold', ascending: true },
}

const ORDER_MAP_PAGE: Record<string, { column: string; ascending: boolean }> = {
  totalSold: { column: 'total_sold', ascending: false },
  totalTraded: { column: 'total_traded_value', ascending: false },
  badgeScore: { column: 'rank_total_badge_score', ascending: true },
  recentTrades: { column: 'rank_last_sale', ascending: true },
  rarest: { column: 'rank_fewest_copies_sold', ascending: true },
  marmotRecovery: { column: 'total_sold', ascending: false },
}
// Supabase and service performance helpers0

function clampRange(p: PaginationOptions): PaginationOptions {
  const from = Math.max(0, Number(p.from) || 0)
  const to = Math.max(from, Math.min(Number(p.to) || from, from + SUPABASE_MAX_ROWS - 1))
  return { from, to }
}

function sanitiseQuery(q?: string): string | null {
  if (!q) return null
  const s = String(q).trim().slice(0, 200)
  if (!s) return null
  // Remove characters that break PostgREST or() syntax
  return s.replace(/[(),]/g, ' ')
}

function buildOrSearch(fields: string[], q?: string): string | null {
  const s = sanitiseQuery(q)
  if (!s) return null
  // Construct Supabase "or" ilike filter across fields
  const parts = fields.map((f) => `${f}.ilike.%${s}%`)
  return parts.join(',')
}

function normaliseError(err: any): { message: string; code?: string } {
  if (!err) return { message: '' }
  const message = err.message || err.toString?.() || 'Unknown error'
  const code = err.code
  return { message, code }
}

// Leaderboard + queue (ungenerated) unified fetcher
export async function fetchLeaderboard(
  view: LeaderboardView | string,
  query: string | undefined,
  pagination: PaginationOptions,
  phase: 'initial' | 'page' = 'initial',
): Promise<DatabaseResponse<any[]>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: [], error: { message: 'Supabase not initialised' } }

  const { from, to } = clampRange(pagination)
  try {
    // Queue view uses a different source
    if (view === 'queue') {
      const run = async () => {
        let qb = supabase
          .from('get_ungenerated_nfts')
          .select('*')
          .order('rank_queue_position', { ascending: true })
          .range(from, to)

        const or = buildOrSearch(['username', 'name'], query)
        if (or) qb = qb.or(or)

        return qb
      }
      const { data, error } = await run()
      if (error) return { data: [], error: normaliseError(error) }
      return { data: (data || []) as any, error: null }
    }

    const orderSpec =
      (phase === 'initial' ? ORDER_MAP_INITIAL : ORDER_MAP_PAGE)[view as string] || ORDER_MAP_INITIAL.totalSold

    // Marmot Recovery: resolve author ids first, then filter leaderboard by that set
    if (view === 'marmotRecovery') {
      const idsResp = await supabase
        .from('x_users')
        .select('author_id')
        .eq('xch_address', MARMOT_BADGE_XCH)
        .range(0, 9999)

      if (idsResp.error) return { data: [], error: normaliseError(idsResp.error) }
      const ids = (idsResp.data || []).map((r: any) => r.author_id).filter(Boolean)
      if (ids.length === 0) return { data: [], error: null }

      let qb = supabase
        .from('get_leaderboard')
        .select('*')
        .in('author_id', ids)
        .order(orderSpec.column, { ascending: orderSpec.ascending })
        .range(from, to)

      const or = buildOrSearch(['username', 'name'], query)
      if (or) qb = qb.or(or)

      const { data, error } = await qb
      if (error) return { data: [], error: normaliseError(error) }
      return { data: (data || []) as any, error: null }
    }

    // Default leaderboard
    let qb = supabase
      .from('get_leaderboard')
      .select('*')
      .order(orderSpec.column, { ascending: orderSpec.ascending })
      .range(from, to)

    const or = buildOrSearch(['username', 'name'], query)
    if (or) qb = qb.or(or)

    const { data, error } = await qb
    if (error) return { data: [], error: normaliseError(error) }
    return { data: (data || []) as any, error: null }
  } catch (e: any) {
    return { data: [], error: normaliseError(e) }
  }
}

// User profile info (single row)
export async function fetchUserProfile(username: string): Promise<DatabaseResponse<UserProfile | null>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: { message: 'Supabase not initialised' } }
  try {
    const { data, error } = await supabase
      .from('get_user_page_info')
      .select('*')
      .ilike('username', username)
      .maybeSingle()

    if (error) return { data: null, error: normaliseError(error) }
    return { data: (data as UserProfile) ?? null, error: null }
  } catch (e: any) {
    return { data: null, error: normaliseError(e) }
  }
}

// User PFP collections
export async function fetchUserPfps(
  view: 'owned' | 'others',
  username: string,
  pagination: PaginationOptions,
  query?: string,
  countOnly = false,
): Promise<DatabaseResponse<any[]>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: [], error: { message: 'Supabase not initialised' }, count: 0 }
  try {
    const viewName = view === 'owned' ? 'get_user_page_owned_pfps' : 'get_user_page_other_owners'

    let selectOpts: any = '*'
    let headOpts: any = undefined
    if (countOnly) {
      selectOpts = '*'
      headOpts = { count: 'exact', head: true }
    }

    let qb: any = supabase.from(viewName).select(selectOpts, headOpts).ilike('username', username)

    if (!countOnly) {
      qb = qb.range(pagination.from, pagination.to)
    }

    const or = buildOrSearch(['pfp_username', 'pfp_name'], query)
    if (or) qb = qb.or(or)

    const resp = await qb
    if (resp.error) return { data: [], error: normaliseError(resp.error), count: resp.count }

    return { data: (resp.data || []) as any[], error: null, count: resp.count }
  } catch (e: any) {
    return { data: [], error: normaliseError(e) }
  }
}

// Sitemap: paginated usernames from leaderboard ordered by username asc
export async function fetchUsernamesPage(pagination: PaginationOptions): Promise<DatabaseResponse<any[]>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: [], error: { message: 'Supabase not initialised' } }
  try {
    const { from, to } = clampRange(pagination)
    const { data, error } = await supabase
      .from('get_leaderboard')
      .select('username')
      .not('username', 'is', null)
      .order('username', { ascending: true })
      .range(from, to)

    if (error) return { data: [], error: normaliseError(error) }
    return { data: data || [], error: null }
  } catch (e: any) {
    return { data: [], error: normaliseError(e) }
  }
}
