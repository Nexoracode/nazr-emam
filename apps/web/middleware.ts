import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_AUTH_PATHS = ['/auth'];
const PROTECTED_PATHS = ['/profile', '/dashboard'];

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth')) {
    return '/';
  }

  return value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  const isAuthPage = PUBLIC_AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL(getSafeRedirect(request.nextUrl.searchParams.get('redirect')), request.url));
  }

  if (isProtected && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/:path*', '/profile/:path*', '/dashboard/:path*'],
};
