import { NextRequest, NextResponse } from "next/server";
import { addQRCodeToPDF } from "@utils/pdf-qr-utils";

export const dynamic = "force-dynamic";

async function fetchPdf(url: string, authHeader?: string) {
  const headers: HeadersInit = {};
  if (authHeader) {
    headers.Authorization = authHeader;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Upstream failed: ${res.status} ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    const qr = request.nextUrl.searchParams.get("qr");
    const name = request.nextUrl.searchParams.get("name") || "document-with-qr.pdf";

    if (!url || !qr) {
      return NextResponse.json({ message: "Missing url or qr param" }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ message: "Invalid url" }, { status: 400 });
    }

    const upstreamPdf = await fetchPdf(url, request.headers.get("authorization") || undefined);
    const stamped = await addQRCodeToPDF(upstreamPdf, {
      qrText: qr,
      qrSize: 80,
      position: "custom",
      customX: 0.3,
      customY: 0.8,
      padding: 10,
    });

    return new NextResponse(stamped as any, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${name.replace(/"/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to generate PDF with QR" },
      { status: 500 }
    );
  }
}
