import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const laravel = process.env.LARAVEL_API_URL ?? 'http://127.0.0.1:8000';

// Valida la sesión contra la API (fuente de verdad). Solo mirar si la
// cookie existe no basta: tras el logout queda una cookie de sesión vacía
// que causaría un bucle /login <-> /.
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get('cookie');
  if (!cookie || !cookie.includes('laravel-session=')) return false;
  try {
    const res = await fetch(`${laravel}/api/user`, {
      headers: { cookie, Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAuthenticated(request);

  if (!authenticated && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (authenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|sanctum|_next|favicon.ico|.*\\..*).*)'],
};
