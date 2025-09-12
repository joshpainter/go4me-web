export interface NormalizedError {
  message: string
  code?: string
}

export function normaliseError(err: unknown): NormalizedError {
  if (!err) return { message: '' }
  if (typeof err === 'string') return { message: err }
  if (err instanceof Error) return { message: err.message }
  try {
    const obj = err as { message?: unknown; code?: unknown; toString?: unknown }
    const message =
      (typeof obj.message === 'string' && obj.message) ||
      (typeof obj.toString === 'function' ? String(err) : 'Unknown error')
    return { message, code: typeof obj.code === 'string' ? obj.code : undefined }
  } catch {
    return { message: 'Unknown error' }
  }
}
