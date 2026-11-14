import { NextResponse, type NextRequest } from 'next/server';
import { NEXT_PARAM, SESSION_COOKIE, safeNext } from '@reshis-avia/shared';

// Проверяет только наличие куки. Жива ли сессия, выясняет AppShell.
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === '/app' || pathname.startsWith('/app/')) {
    if (hasSession) return NextResponse.next();
    const login = new URL('/login', request.url);
    if (pathname !== '/app') {
      login.searchParams.set(NEXT_PARAM, pathname + search);
    }
    return NextResponse.redirect(login);
  }

  if (hasSession) {
    const next = safeNext(searchParams.get(NEXT_PARAM));
    return NextResponse.redirect(new URL(next ?? '/app', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/app', '/app/:path*', '/login', '/register'],
};
