import { NextRequest, NextResponse } from 'next/server';

/**
 * API route that proxies image requests to avoid CORS issues
 * This endpoint fetches an image from a provided URL and returns it with proper headers
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameter
    const url = request.nextUrl.searchParams.get('url');

    // Validate URL
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    
    // Optional: Restrict to specific domains for security
    // const allowedDomains = ['nos.wjv-1.neo.id'];
    // const urlObj = new URL(url);
    // if (!allowedDomains.includes(urlObj.hostname)) {
    //   return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    // }

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some servers require a user-agent
        'User-Agent': 'Mozilla/5.0 (compatible; OzzyProxy/1.0)'
      }
    }).finally(() => clearTimeout(timeoutId));
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` }, 
        { status: response.status }
      );
    }

    // Get the image data as an array buffer
    const imageData = await response.arrayBuffer();
    
    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Create a new response with the image data and appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    return new NextResponse(imageData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image request' }, 
      { status: 500 }
    );
  }
}
