import { NextRequest, NextResponse } from "next/server";

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const buildCandidateUrls = (rawUrl: string): string[] => {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const push = (candidate: string) => {
    if (!candidate || !isHttpUrl(candidate) || seen.has(candidate)) return;
    seen.add(candidate);
    candidates.push(candidate);
  };

  const normalized = rawUrl.trim();
  const once = safeDecode(normalized);
  const twice = safeDecode(once);

  push(normalized);
  push(once);
  push(twice);

  // Include URI-encoded variants to handle spaces/pipes and unsafe chars.
  const snapshot = [...candidates];
  for (const candidate of snapshot) {
    push(encodeURI(candidate));
  }

  return candidates;
};

const getBackendOrigin = (): string | null => {
  const baseUrl = process.env.NEXT_PUBLIC_BE_BASE_URL || "";
  if (!baseUrl) return null;
  try {
    return new URL(baseUrl).origin;
  } catch {
    return null;
  }
};

const shouldForwardSensitiveHeaders = (
  request: NextRequest,
  candidateUrl: string
): boolean => {
  try {
    const target = new URL(candidateUrl);
    const requestOrigin = new URL(request.url).origin;
    const backendOrigin = getBackendOrigin();

    // Only forward auth/cookies to same-origin or configured backend origin.
    return (
      target.origin === requestOrigin ||
      (backendOrigin !== null && target.origin === backendOrigin)
    );
  } catch {
    return false;
  }
};

export async function proxyFileByUrl(
  request: NextRequest,
  rawUrl: string,
  forceInline: boolean
): Promise<NextResponse> {
  try {
    const candidateUrls = buildCandidateUrls(rawUrl);

    if (candidateUrls.length === 0) {
      return NextResponse.json({ message: "Invalid url" }, { status: 400 });
    }

    const baseUpstreamHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; OzzyDND/1.0)",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };

    const commonPassthroughHeaders = ["accept"] as const;

    for (const headerName of commonPassthroughHeaders) {
      const value = request.headers.get(headerName);
      if (value) {
        baseUpstreamHeaders[headerName] = value;
      }
    }

    let lastStatus = 400;
    let lastStatusText = "Bad Request";

    for (const candidateUrl of candidateUrls) {
      try {
        const upstreamHeaders: Record<string, string> = { ...baseUpstreamHeaders };
        if (shouldForwardSensitiveHeaders(request, candidateUrl)) {
          const auth = request.headers.get("authorization");
          const cookie = request.headers.get("cookie");
          if (auth) upstreamHeaders.authorization = auth;
          if (cookie) upstreamHeaders.cookie = cookie;
        }

        const upstream = await fetch(candidateUrl, {
          headers: upstreamHeaders,
          cache: "no-store",
        });

        lastStatus = upstream.status;
        lastStatusText = upstream.statusText;

        if (!upstream.ok || !upstream.body) {
          continue;
        }

        const contentType =
          upstream.headers.get("content-type") || "application/octet-stream";
        const isPdf =
          contentType.includes("pdf") || candidateUrl.toLowerCase().includes(".pdf");
        const shouldInline = forceInline || isPdf;

        const responseHeaders = new Headers({
          "Content-Type": contentType,
          "Content-Disposition": shouldInline ? "inline" : "attachment",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        });

        return new NextResponse(upstream.body, {
          status: upstream.status,
          headers: responseHeaders,
        });
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { message: `Upstream failed: ${lastStatus} ${lastStatusText}` },
      { status: lastStatus }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Proxy failed" },
      { status: 500 }
    );
  }
}
