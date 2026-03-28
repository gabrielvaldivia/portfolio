import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Rewrite /chat/[id] to homepage with conversation param
  const match = request.nextUrl.pathname.match(/^\/chat\/(\d+)$/)
  if (match) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('conversation', match[1])
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/chat/:id(\\d+)',
}
