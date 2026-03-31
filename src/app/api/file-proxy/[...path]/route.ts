import { NextRequest, NextResponse } from "next/server";
import { proxyFileByUrl } from "../lib";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const params = await context.params;
  const rawPath = params.path?.join("/") || "";
  const forceInline = new URL(request.url).searchParams.get("inline") === "true";

  if (!rawPath) {
    return NextResponse.json({ message: "Invalid url" }, { status: 400 });
  }

  return proxyFileByUrl(request, rawPath, forceInline);
}
