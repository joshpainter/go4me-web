import { SUPABASE_MAX_ROWS } from '../../constants'
import type { PaginationOptions } from '../types'

export function clampRange(p: PaginationOptions): PaginationOptions {
  const from = Math.max(0, Number(p.from) || 0)
  const to = Math.max(from, Math.min(Number(p.to) || from, from + SUPABASE_MAX_ROWS - 1))
  return { from, to }
}
