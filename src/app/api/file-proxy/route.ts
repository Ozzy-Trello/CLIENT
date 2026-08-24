import { NextRequest, NextResponse } from "next/server";
import { proxyFileByUrl } from "./lib";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  const forceInline = searchParams.get("inline") === "true";

  if (!rawUrl) {
    return NextResponse.json(
      { message: "Missing `url` query parameter" },
      { status: 400 }
    );
  }

  return proxyFileByUrl(request, rawUrl, forceInline);
}
