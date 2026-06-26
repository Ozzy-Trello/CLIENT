"use client";

import React, { useEffect, useState } from "react";
import { Alert, Spin, Typography } from "antd";

interface InlinePdfFrameProps {
  url: string;
}

const InlinePdfFrame: React.FC<InlinePdfFrameProps> = ({ url }) => {
  const [objectUrl, setObjectUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let localObjectUrl = "";

    const loadPdf = async () => {
      if (!url) return;

      setLoading(true);
      setError("");
      setObjectUrl("");

      try {
        const response = await fetch(url);
        const contentType = response.headers.get("content-type") || "";

        console.log("[PK] PDF proxy response:", {
          url,
          status: response.status,
          ok: response.ok,
          contentType,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          console.log("[PK] PDF proxy error body:", body.slice(0, 1000));
          if (!cancelled) {
            setError(`Failed to load PDF (${response.status})`);
          }
          return;
        }

        const blob = await response.blob();
        const pdfBlob = contentType.includes("pdf")
          ? blob
          : new Blob([blob], { type: "application/pdf" });

        localObjectUrl = URL.createObjectURL(pdfBlob);
        if (!cancelled) {
          setObjectUrl(localObjectUrl);
        }
      } catch (err) {
        console.log("[PK] PDF proxy fetch failed:", err);
        if (!cancelled) setError("Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex h-[60vh] min-h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <Spin />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" showIcon message={error} />;
  }

  if (!objectUrl) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <Typography.Text strong>Preview PO</Typography.Text>
        <Typography.Text type="secondary" className="text-xs">
          PDF preview
        </Typography.Text>
      </div>
      <iframe
        src={`${objectUrl}#toolbar=0&navpanes=0&view=FitH`}
        title="PO stamp attachment"
        className="h-[60vh] min-h-[420px] w-full bg-slate-50"
      />
    </div>
  );
};

export default InlinePdfFrame;
