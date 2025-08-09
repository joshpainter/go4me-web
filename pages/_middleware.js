import { NextResponse } from 'next/server'

// Middleware to rewrite ONLY username subdomains (username.go4.me / username.localhost)
// to the /domain page. The bare domains (go4.me / localhost) should serve the home page.
// For subdomains we append ?pfp=<username> so /domain can load user-specific data.
// Avoid loops by only acting on pathname '/'.
export function middleware(req) {
  const url = req.nextUrl.clone()
  const originalPath = url.pathname
  if (originalPath !== '/') {
    const res = NextResponse.next()
    res.headers.set('x-mw', 'skip-non-root')
    return res
  }

  const hostHeader = req.headers.get('host') || ''
  const host = hostHeader.split(':')[0]
  const normalizedHost = host === '127.0.0.1' ? 'localhost' : host

  if (normalizedHost === 'go4.me' || normalizedHost === 'localhost') {
    const res = NextResponse.next()
    res.headers.set('x-mw', 'root')
    return res
  }

  if (normalizedHost.endsWith('.go4.me') || normalizedHost.endsWith('.localhost')) {
    const parts = normalizedHost.split('.')
    const sub = parts[0]
    if (sub && sub !== 'go4' && sub !== 'localhost') {
      url.pathname = '/domain'
      url.searchParams.set('pfp', sub)
      const res = NextResponse.rewrite(url)
      res.headers.set('x-mw', 'rewrite-subdomain')
      res.headers.set('x-mw-sub', sub)
      return res
    }
  }

  const res = NextResponse.next()
  res.headers.set('x-mw', 'no-match')
  return res
}
