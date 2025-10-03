// Query sanitization & dynamic OR filter helpers

export function sanitiseQuery(q?: string): string | null {
  if (!q) return null
  const s = String(q).trim().slice(0, 200)
  if (!s) return null
  return s.replace(/[(),]/g, ' ')
}

export function buildOrSearch(fields: string[], q?: string): string | null {
  const s = sanitiseQuery(q)
  if (!s) return null
  return fields.map((f) => `${f}.ilike.%${s}%`).join(',')
}
