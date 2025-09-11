/* Centralised Supabase database service
 * Provides reusable, typed functions for all database operations.
 * Follows existing project patterns and consolidates error handling.
 */
import { getSupabaseClient } from './supabaseClient'
import type { DatabaseResponse, LeaderboardView, PaginationOptions } from './types'
import { MARMOT_BADGE_XCH } from '../constants'
import type { Tables } from './database.types'
import { clampRange } from './core/pagination'
import { buildOrSearch } from './core/filters'
import { normaliseError } from './core/errors'
import { ORDER_MAP_INITIAL, ORDER_MAP_PAGE } from './core/ordering'
import {
  LEADERBOARD_COLUMNS,
  QUEUE_COLUMNS,
  USER_PROFILE_COLUMNS,
  OWNED_PFPS_COLUMNS,
  OTHER_OWNERS_COLUMNS,
} from './core/columns'

// (Legacy note) Ordering + helpers have been extracted to /core. Keep this file focused on orchestration.

// Leaderboard + queue (ungenerated) unified fetcher
// Row type helpers derived from generated Supabase types
type LeaderboardRow = Tables<'get_leaderboard'>
type QueueRow = Tables<'get_ungenerated_nfts'>

// Function overloads for stronger typing based on "view" parameter
export async function fetchLeaderboard(
  view: 'queue',
  query: string | undefined,
  pagination: PaginationOptions,
  phase?: 'initial' | 'page',
): Promise<DatabaseResponse<QueueRow[]>>
export async function fetchLeaderboard(
  view: Exclude<LeaderboardView, 'queue'> | string,
  query: string | undefined,
  pagination: PaginationOptions,
  phase?: 'initial' | 'page',
): Promise<DatabaseResponse<LeaderboardRow[]>>
export async function fetchLeaderboard(
  view: LeaderboardView | string,
  query: string | undefined,
  pagination: PaginationOptions,
  phase: 'initial' | 'page' = 'initial',
): Promise<DatabaseResponse<(LeaderboardRow | QueueRow)[]>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: [], error: { message: 'Supabase not initialised' } }

  const { from, to } = clampRange(pagination)
  try {
    // Queue view uses a different source
    if (view === 'queue') {
      const run = async () => {
        let qb = supabase
          .from('get_ungenerated_nfts')
          .select(QUEUE_COLUMNS)
          .order('rank_queue_position', { ascending: true })
          .range(from, to)

        const or = buildOrSearch(['username', 'name'], query)
        if (or) qb = qb.or(or)

        return qb
      }
      const { data, error } = await run()
      if (error) return { data: [], error: normaliseError(error) }
      return { data: (data || []) as unknown as QueueRow[], error: null }
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
        .select(LEADERBOARD_COLUMNS)
        .in('author_id', ids)
        .order(orderSpec.column, { ascending: orderSpec.ascending })
        .range(from, to)

      const or = buildOrSearch(['username', 'name'], query)
      if (or) qb = qb.or(or)

      const { data, error } = await qb
      if (error) return { data: [], error: normaliseError(error) }
      return { data: (data || []) as unknown as LeaderboardRow[], error: null }
    }

    // Default leaderboard
    let qb = supabase
      .from('get_leaderboard')
      .select(LEADERBOARD_COLUMNS)
      .order(orderSpec.column, { ascending: orderSpec.ascending })
      .range(from, to)

    const or = buildOrSearch(['username', 'name'], query)
    if (or) qb = qb.or(or)

    const { data, error } = await qb
    if (error) return { data: [], error: normaliseError(error) }
    return { data: (data || []) as unknown as LeaderboardRow[], error: null }
  } catch (e: any) {
    return { data: [], error: normaliseError(e) }
  }
}

// User profile info (single row)
type UserProfileRow = Tables<'get_user_page_info'>
export async function fetchUserProfile(username: string): Promise<DatabaseResponse<UserProfileRow | null>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: { message: 'Supabase not initialised' } }
  try {
    const { data, error } = await supabase
      .from('get_user_page_info')
      .select(USER_PROFILE_COLUMNS)
      .ilike('username', username)
      .maybeSingle()

    if (error) return { data: null, error: normaliseError(error) }
    return { data: (data as unknown as UserProfileRow) ?? null, error: null }
  } catch (e: any) {
    return { data: null, error: normaliseError(e) }
  }
}

// User PFP collections
type OwnedPfpRow = Tables<'get_user_page_owned_pfps'>
type OtherOwnerRow = Tables<'get_user_page_other_owners'>

export async function fetchUserPfps(
  view: 'owned',
  username: string,
  pagination: PaginationOptions,
  query?: string,
  countOnly?: boolean,
): Promise<DatabaseResponse<OwnedPfpRow[]>>
export async function fetchUserPfps(
  view: 'others',
  username: string,
  pagination: PaginationOptions,
  query?: string,
  countOnly?: boolean,
): Promise<DatabaseResponse<OtherOwnerRow[]>>
export async function fetchUserPfps(
  view: 'owned' | 'others',
  username: string,
  pagination: PaginationOptions,
  query?: string,
  countOnly = false,
): Promise<DatabaseResponse<(OwnedPfpRow | OtherOwnerRow)[]>> {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: [], error: { message: 'Supabase not initialised' }, count: 0 }
  try {
    const viewName = view === 'owned' ? 'get_user_page_owned_pfps' : 'get_user_page_other_owners'

    let selectOpts: any = view === 'owned' ? OWNED_PFPS_COLUMNS : OTHER_OWNERS_COLUMNS
    let headOpts: any = undefined
    if (countOnly) {
      // For count-only, still select a minimal column (username) so PostgREST processes count.
      selectOpts = view === 'owned' ? 'username' : 'username'
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

    return { data: (resp.data || []) as (OwnedPfpRow | OtherOwnerRow)[], error: null, count: resp.count }
  } catch (e: any) {
    return { data: [], error: normaliseError(e) }
  }
}

// Sitemap: paginated usernames from leaderboard ordered by username asc
type UsernameRow = Pick<Tables<'get_leaderboard'>, 'username'>
export async function fetchUsernamesPage(pagination: PaginationOptions): Promise<DatabaseResponse<UsernameRow[]>> {
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
    return { data: (data || []) as UsernameRow[], error: null }
  } catch (e: any) {
    return { data: [], error: normaliseError(e) }
  }
}
