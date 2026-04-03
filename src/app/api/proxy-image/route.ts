import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');
    const forceInline = searchParams.get('inline') === 'true';

    if (!rawUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate/normalize URL, allowing unencoded spaces/pipes by retrying with encodeURI
    const tryParse = (candidate: string | null) => {
      if (!candidate) return null;
      try {
        return new URL(candidate);
      } catch {
        return null;
      }
    };

    // Allow encoded full URLs (decode once)
    let targetUrl = (() => {
      try {
        return decodeURIComponent(rawUrl.trim());
      } catch {
        return rawUrl.trim();
      }
    })();
    let parsed = tryParse(targetUrl);

    if (!parsed) {
      const encoded = encodeURI(rawUrl);
      parsed = tryParse(encoded);
      if (parsed) {
        targetUrl = encoded;
      }
    }

    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Ensure path is safely encoded (handles spaces, pipes, etc.)
    try {
      const rebuilt = new URL(targetUrl);
      const encodedPath = rebuilt.pathname
        .split("/")
        .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
        .join("/");
      rebuilt.pathname = encodedPath;
      targetUrl = rebuilt.toString();
    } catch {
      // fallback to original targetUrl if rebuilding fails
    }

    // Fetch the file (image, PDF, etc.)
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; OzzyDND/1.0)',
    };
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');
    if (authHeader) {
      upstreamHeaders['Authorization'] = authHeader;
    }
    if (cookieHeader) {
      upstreamHeaders['Cookie'] = cookieHeader;
    }

    const response = await fetch(targetUrl, {
      headers: upstreamHeaders,
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
    const isPDF = contentType === 'application/pdf' || targetUrl.toLowerCase().includes('.pdf');
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
