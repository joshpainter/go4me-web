export interface NormalizedError {
  message: string
  code?: string
}

export function normaliseError(err: any): NormalizedError {
  if (!err) return { message: '' }
  const message = err.message || (typeof err === 'string' ? err : err.toString?.()) || 'Unknown error'
  return { message, code: err.code }
}
