/**
 * Cross-subdomain storage adapter for WalletConnect
 * Uses cookies for cross-subdomain persistence in production
 * Falls back to localStorage in development
 */

import { IKeyValueStorage } from '@walletconnect/keyvaluestorage'

class CrossDomainStorage implements IKeyValueStorage {
  private domain: string

  constructor() {
    this.domain = this.computeCookieDomain()
  }

  private computeCookieDomain(): string {
    if (typeof window === 'undefined') return ''
    const hn = window.location.hostname

    // If localhost or an IP, use host-only cookies (no domain attribute)
    const isIP = /^[0-9.]+$/.test(hn) || /^[a-f0-9:]+$/i.test(hn)
    if (hn === 'localhost' || isIP) return ''

    // Default: use last two labels as cookie domain for cross-subdomain sharing
    const parts = hn.split('.')
    if (parts.length >= 2) {
      const root = parts.slice(-2).join('.')
      return `.${root}`
    }
    return ''
  }

  async getItem<T = any>(key: string): Promise<T | undefined> {
    const value = this.getCookie(key)
    if (value === undefined) return undefined

    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  }

  async setItem<T = any>(key: string, value: T): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    this.setCookie(key, stringValue)
  }

  async removeItem(key: string): Promise<void> {
    this.deleteCookie(key)
  }

  async getKeys(): Promise<string[]> {
    return this.getCookieKeys()
  }

  async getEntries<T = any>(): Promise<[string, T][]> {
    const keys = await this.getKeys()
    const entries: [string, T][] = []

    for (const key of keys) {
      const value = await this.getItem<T>(key)
      if (value !== undefined) {
        entries.push([key, value])
      }
    }

    return entries
  }

  // Encode cookie key to be cookie-name safe (base64url with prefix)
  private encodeKeyName(key: string): string {
    if (typeof window === 'undefined') return key
    const bytes = new TextEncoder().encode(key)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const b64 = window.btoa(binary)
    return 'wc2_' + b64.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  }

  private decodeKeyName(cookieName: string): string | null {
    if (typeof window === 'undefined') return null
    if (!cookieName.startsWith('wc2_')) return null
    const b64url = cookieName.slice(4).replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64url.length % 4 === 2 ? '==' : b64url.length % 4 === 3 ? '=' : ''
    try {
      const b64 = b64url + pad
      const binary = window.atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return new TextDecoder().decode(bytes)
    } catch { return null }
  }

  private readCookieByName(exactName: string): string | undefined {
    if (typeof document === 'undefined') return undefined
    const search = `; ${exactName}=`
    const value = `; ${document.cookie}`
    const parts = value.split(search)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return undefined
  }

  private getCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined
    const enc = this.encodeKeyName(name)

    // Try single cookie value first
    const single = this.readCookieByName(enc)
    if (single !== undefined) {
      try { return decodeURIComponent(single) } catch { return single }
    }

    // Try chunked cookies
    const partsStr = this.readCookieByName(`${enc}.parts`)
    const partsCount = partsStr ? parseInt(partsStr, 10) : 0
    if (Number.isFinite(partsCount) && partsCount > 0) {
      let acc = ''
      for (let i = 0; i < partsCount; i++) {
        acc += this.readCookieByName(`${enc}.p${i}`) || ''
      }
      try { return decodeURIComponent(acc) } catch { return acc }
    }

    return undefined
  }

  private setCookie(name: string, value: string): void {
    if (typeof document === 'undefined') return

    const encName = this.encodeKeyName(name)
    const expires = new Date(); expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days
    const secureFlag = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
    const domainAttr = this.domain ? `; domain=${this.domain}` : ''


    // Clear any existing cookies for this key
    this.deleteCookie(name)

    // Encode value and chunk if necessary (safe size ~3000 chars per cookie value)
    const encVal = encodeURIComponent(value)
    const MAX = 3000
    if (encVal.length <= MAX) {
      document.cookie = `${encName}=${encVal}; expires=${expires.toUTCString()}${domainAttr}; path=/; SameSite=Lax${secureFlag}`
      return
    }

    const parts = Math.ceil(encVal.length / MAX)
    document.cookie = `${encName}.parts=${parts}; expires=${expires.toUTCString()}${domainAttr}; path=/; SameSite=Lax${secureFlag}`
    for (let i = 0; i < parts; i++) {
      const slice = encVal.slice(i * MAX, (i + 1) * MAX)
      document.cookie = `${encName}.p${i}=${slice}; expires=${expires.toUTCString()}${domainAttr}; path=/; SameSite=Lax${secureFlag}`
    }

    // Enforce a total cookie budget to prevent large headers (approximate)
    this.enforceCookieBudget()
  }

  private deleteCookie(name: string): void {
    if (typeof document === 'undefined') return
    const enc = this.encodeKeyName(name)
    const domainAttr = this.domain ? `; domain=${this.domain}` : ''

    // Delete single cookie
    document.cookie = `${enc}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${domainAttr}; path=/`

    // If chunked, delete parts header and all pieces
    const partsStr = this.readCookieByName(`${enc}.parts`)
    const partsCount = partsStr ? parseInt(partsStr, 10) : 0
    if (Number.isFinite(partsCount) && partsCount > 0) {
      document.cookie = `${enc}.parts=; expires=Thu, 01 Jan 1970 00:00:00 UTC${domainAttr}; path=/`
      for (let i = 0; i < partsCount; i++) {
        document.cookie = `${enc}.p${i}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${domainAttr}; path=/`
      }
    }
  }

  private getCookieKeys(): string[] {
    if (typeof document === 'undefined') return []

    const cookies = document.cookie.split(';')
    const seen = new Set<string>()

    for (const cookie of cookies) {
      const [rawName] = cookie.trim().split('=')
      if (!rawName) continue
      // Single cookie key
      if (rawName.startsWith('wc2_') && !rawName.endsWith('.parts') && !/\.p\d+$/.test(rawName)) {
        const decoded = this.decodeKeyName(rawName)
        if (decoded) seen.add(decoded)
      }
      // Chunked cookie key header
      if (rawName.startsWith('wc2_') && rawName.endsWith('.parts')) {
        const base = rawName.slice(0, -'.parts'.length)
        const decoded = this.decodeKeyName(base)
        if (decoded) seen.add(decoded)
      }
    }

    return Array.from(seen)
  }

  private pruneNonCritical(): void {
    if (typeof document === 'undefined') return
    const domainAttr = this.domain ? `; domain=${this.domain}` : ''
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [rawName] = cookie.trim().split('=')
      if (!rawName) continue
      // Remove noisy core caches that can bloat headers
      if (rawName.startsWith('wc2_') && (rawName.includes('messages') || rawName.includes('expirer'))) {
        document.cookie = `${rawName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${domainAttr}; path=/`
      }
      // Also remove legacy unencoded WalletConnect cookies if present
      if (rawName.startsWith('wc@2:') || rawName.startsWith('walletconnect')) {
        document.cookie = `${rawName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${domainAttr}; path=/`
      }
    }
  }

  // One-off migration/cleanup of legacy cookie names
  cleanupLegacy(): void {
    this.pruneNonCritical()
  }

  private enforceCookieBudget(): void {
    if (typeof document === 'undefined') return
    const total = document.cookie.length
    // If approaching 8KB header limits, try removing older chunk markers (best-effort)
    if (total > 7000) {
      const domainAttr = this.domain ? `; domain=${this.domain}` : ''
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [rawName] = cookie.trim().split('=')
        if (!rawName) continue
        if (rawName.endsWith('.parts') || /\.p\d+$/.test(rawName)) {
          document.cookie = `${rawName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${domainAttr}; path=/`
        }
      }
    }
  }

  // Debug utility to check storage state (development only)
  async debugStorage(): Promise<void> {
    if (typeof console === 'undefined' || process.env.NODE_ENV === 'production') return

    console.log('CrossDomainStorage Debug:')
    console.log('- Domain:', this.domain || '(host-only cookie)')
    console.log('- Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A')

    const keys = await this.getKeys()
    console.log('- WalletConnect keys found:', keys.length)

    for (const key of keys) {
      const value = await this.getItem(key)
      console.log(`  - ${key}:`, value ? 'exists' : 'missing')
    }
  }
}

// Export singleton instance
export const crossDomainStorage = new CrossDomainStorage()

// Export class for testing
export { CrossDomainStorage }

// Debug function for development only
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).debugWalletStorage = () => crossDomainStorage.debugStorage()
}
