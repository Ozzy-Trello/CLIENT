import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function decodeRepeatedly(value: string, times: number = 3) {
  let current = value;
  for (let i = 0; i < times; i++) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const rawPath = params.path?.join("/") || "";
    const targetUrl = decodeRepeatedly(rawPath);

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return NextResponse.json(
        { message: "Invalid url" },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {};
    const auth = request.headers.get("authorization");
    if (auth) headers.Authorization = auth;

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
    const upstream = await fetch(safeUrl, { headers });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          message: `Upstream failed: ${upstream.status} ${upstream.statusText}`,
        },
        { status: upstream.status }
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
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
