import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  
  // Fix: Check both cookies and localStorage for better mobile compatibility
  let accessToken = request.cookies.get('accessToken')?.value;
  
  // If no cookie token, check if localStorage might have it by examining the request headers
  // Note: We can't directly access localStorage in middleware, but we can be more lenient
  // and let the client-side handle the final authentication check
  if (!accessToken) {
    // Check if this might be a client with localStorage tokens by looking for common browser headers
    const userAgent = request.headers.get('user-agent') || '';
    const isBrowser = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
    
    // For browser requests, be more lenient and let client-side auth handle it
    if (isBrowser) {
      // Add a header to indicate we should check localStorage on client side
      const response = NextResponse.next();
      response.headers.set('x-check-localstorage', 'true');
      return response;
    }
  }
  
  const protectedRoutes = ['/user', '/webhook', '/workspace'];
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// This config looks correct
export const config = {
  matcher: ['/user/:path*', '/webhook/:path*', '/workspace/:path*']
};