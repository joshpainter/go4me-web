import { getSupabaseClient } from '../supabaseClient'
import { clampRange } from '../core/pagination'
import { buildOrSearch } from '../core/filters'
import { normaliseError } from '../core/errors'
import { ORDER_MAP_INITIAL, ORDER_MAP_PAGE } from '../core/ordering'
import { LEADERBOARD_COLUMNS, QUEUE_COLUMNS } from '../core/columns'
import type { Tables } from '../database.types'
import type { DatabaseResponse, LeaderboardView, PaginationOptions } from '../types'

// Row types
export type LeaderboardRow = Tables<'get_leaderboard'>
export type QueueRow = Tables<'get_ungenerated_nfts'>

interface LeaderboardQueryArgs {
  view: LeaderboardView | string
  query?: string
  pagination: PaginationOptions
  phase?: 'initial' | 'page'
}

// Resolve base query builder (no filters applied yet)
export function resolveLeaderboardQuery(args: LeaderboardQueryArgs) {
  const { view, pagination, phase = 'initial' } = args
  const supabase = getSupabaseClient()
  if (!supabase) return { error: { message: 'Supabase not initialised' } as const }
  const { from, to } = clampRange(pagination)

  if (view === 'queue') {
    const qb = supabase
      .from('get_ungenerated_nfts')
      .select(QUEUE_COLUMNS)
      .order('rank_queue_position', { ascending: true })
      .range(from, to)
    return { qb, from, to }
  }

  const orderSpec = (phase === 'initial' ? ORDER_MAP_INITIAL : ORDER_MAP_PAGE)[view] || ORDER_MAP_INITIAL.totalSold

  let qb = supabase.from('get_leaderboard').select(LEADERBOARD_COLUMNS)

  if (view === 'marmotRecovery') {
    qb = qb.eq('xch_address', 'xch120ywvwahucfptkeuzzdpdz5v0nnarq5vgw94g247jd5vswkn7rls35y2gc')
  }

  qb = qb.order(orderSpec.column, { ascending: orderSpec.ascending }).range(from, to)
  return { qb, from, to }
}

// Apply search filter lazily
export function applySearch(qb: any, fields: string[], query?: string) {
  if (!query || query.trim().length < 1) return qb
  const or = buildOrSearch(fields, query)
  return or ? qb.or(or) : qb
}

export async function executeLeaderboardQuery<T extends LeaderboardRow | QueueRow>(
  qb: any,
): Promise<DatabaseResponse<T[]>> {
  try {
    const { data, error } = await qb
    if (error) return { data: [], error: normaliseError(error) }
    return { data: (data || []) as T[], error: null }
  } catch (e: any) {
    return { data: [], error: normaliseError(e) }
  }
}

export async function fetchLeaderboardDecomposed(
  view: LeaderboardView | string,
  query: string | undefined,
  pagination: PaginationOptions,
  phase: 'initial' | 'page' = 'initial',
): Promise<DatabaseResponse<(LeaderboardRow | QueueRow)[]>> {
  const resolved = resolveLeaderboardQuery({ view, pagination, phase })
  if ('error' in resolved) return { data: [], error: { message: resolved.error?.message || 'Unknown error' } }
  let { qb } = resolved

  qb = applySearch(qb, view === 'queue' ? ['username', 'name'] : ['username', 'name'], query)

  return executeLeaderboardQuery(qb)
}
