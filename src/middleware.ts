import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('🔥 Middleware running for:', request.nextUrl.pathname);
  
  // Read token from cookies (not TokenStorage!)
  const accessToken = request.cookies.get('accessToken')?.value;
  console.log('Token found:', !!accessToken);
  
  const protectedRoutes = ['/user', '/webhook', '/workspace'];
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  console.log('Is protected route:', isProtectedRoute);

  if (isProtectedRoute && !accessToken) {
    console.log('❌ Redirecting to login - no token');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  console.log('✅ Access granted');
  return NextResponse.next();
}

// This config looks correct
export const config = {
  matcher: ['/user/:path*', '/webhook/:path*', '/workspace/:path*']
};