import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'gbi_cms_session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME)

  // 1. Guard Dashboard Routes: Redirect to /login if unauthenticated
  if (pathname.startsWith('/dashboard')) {
    if (!hasSessionCookie) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 2. Redirect authenticated staff away from /login to /dashboard
  if (pathname === '/login' && hasSessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
