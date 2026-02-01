import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    const forceInline = searchParams.get('inline') === 'true';

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate that the URL is safe to fetch
    try {
      new URL(fileUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Fetch the file (image, PDF, etc.)
    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OzzyDND/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the file data
    const fileBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Determine if this is a PDF and set appropriate Content-Disposition
    const isPDF = contentType === 'application/pdf' || fileUrl.toLowerCase().includes('.pdf');
    const shouldBeInline = isPDF || forceInline;
    
    // Return the file with proper headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': shouldBeInline ? 'inline' : 'attachment',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    };

    // Add additional headers for PDFs to ensure inline display
    if (shouldBeInline) {
      headers['X-Content-Type-Options'] = 'nosniff';
      if (isPDF) {
        headers['Content-Security-Policy'] = "default-src 'self'; object-src 'self'";
      }
    }

    // Add the remaining header
    headers['Access-Control-Allow-Headers'] = 'Content-Type';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Proxy file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}