import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Since we're using localStorage only, we can't access it in middleware
  // Let client-side authentication handle token validation entirely
  // Middleware will be more lenient and let the client-side components handle redirects
  
  const protectedRoutes = ['/user', '/webhook', '/workspace'];
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // For protected routes, add a header to indicate client-side auth check is needed
  if (isProtectedRoute) {
    const response = NextResponse.next();
    response.headers.set('x-require-auth', 'true');
    return response;
  }

  return NextResponse.next();
}

// This config looks correct
export const config = {
  matcher: ['/user/:path*', '/webhook/:path*', '/workspace/:path*']
};