import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const targetUrl = request.nextUrl.searchParams.get("url");
    if (!targetUrl) {
      return NextResponse.json({ message: "Missing url param" }, { status: 400 });
    }

    // Prevent SSRF by allowing only http/https
    if (!/^https?:\/\//i.test(targetUrl)) {
      return NextResponse.json({ message: "Invalid url" }, { status: 400 });
    }

    // Proxy the PDF fetch; avoid CORS issues on the client
    const toSafeUrl = (raw: string) => {
      const decoded = raw.trim();
      try {
        const u = new URL(decoded);
        const encodedPath = u.pathname
          .split("/")
          .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
          .join("/");
        return `${u.origin}${encodedPath}${u.search}`;
      } catch {
        return encodeURI(decoded);
      }
    };

    const safeUrl = toSafeUrl(targetUrl);

    const upstream = await fetch(safeUrl, {
      headers: {
        // Copy auth header if present (optional)
        Authorization: request.headers.get("authorization") || "",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { message: `Upstream failed: ${upstream.status} ${upstream.statusText}` },
        { status: upstream.status }
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        // Allow downloading/opening directly
        "cache-control": "private, max-age=60",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Proxy failed" },
      { status: 500 }
    );
  }
}
