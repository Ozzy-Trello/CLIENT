"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import TokenStorage from "@utils/token-storage";
import { buildFileProxyUrl, isFileProxyUrl, toDirectFileUrl } from "@utils/file-url";
import { setupPDFWorker } from "@utils/pdf-worker-setup";

const Document = dynamic(() => import("react-pdf").then((mod) => mod.Document), {
  ssr: false,
});

const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), {
  ssr: false,
});

interface PreviewPdfViewerProps {
  url: string;
  zoom?: number;
}

interface FetchCandidate {
  fetchUrl: string;
  headers?: Record<string, string>;
}

const PreviewPdfViewer: React.FC<PreviewPdfViewerProps> = ({ url, zoom = 1 }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string>("");

  const fetchCandidates = useMemo<FetchCandidate[]>(() => {
    const candidates: FetchCandidate[] = [];
    const seen = new Set<string>();
    const accessToken = TokenStorage.getAccessToken();
    const authHeaders = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const normalizedUrl = toDirectFileUrl(url);
    const backendBaseUrl = process.env.NEXT_PUBLIC_BE_BASE_URL || "";

    const pushCandidate = (fetchUrl: string, headers?: Record<string, string>) => {
      if (!fetchUrl) return;
      const key = `${fetchUrl}::${headers?.Authorization ? "auth" : "noauth"}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ fetchUrl, headers });
    };

    if (backendBaseUrl && normalizedUrl.includes(backendBaseUrl)) {
      pushCandidate(normalizedUrl, authHeaders);
      return candidates;
    }

    if (/^https?:\/\//i.test(normalizedUrl)) {
      // Use the same no-cache proxy as downloads so both actions receive the
      // same freshly generated document from dynamic upstream URLs.
      pushCandidate(buildFileProxyUrl(normalizedUrl), authHeaders);
      return candidates;
    }

    if (isFileProxyUrl(url)) {
      pushCandidate(buildFileProxyUrl(url), authHeaders);
      return candidates;
    }

    pushCandidate(normalizedUrl, authHeaders);
    return candidates;
  }, [url]);

  useEffect(() => {
    void setupPDFWorker();
  }, []);

  useEffect(() => {
    let revokedUrl = "";
    let cancelled = false;

    const fetchPdfAsBlob = async () => {
      setLoading(true);
      setError(false);
      setNumPages(null);
      setObjectUrl("");

      for (const candidate of fetchCandidates) {
        try {
          const response = await fetch(candidate.fetchUrl, {
            headers: candidate.headers || {},
          });
          if (!response.ok) {
            continue;
          }

          const blob = await response.blob();
          const normalizedBlob = blob.type.includes("pdf")
            ? blob
            : new Blob([blob], { type: "application/pdf" });

          revokedUrl = URL.createObjectURL(normalizedBlob);
          if (!cancelled) {
            setObjectUrl(revokedUrl);
            return;
          }
          if (revokedUrl) {
            URL.revokeObjectURL(revokedUrl);
          }
          return;
        } catch {
          continue;
        }
      }

      if (!cancelled) {
        setError(true);
        setLoading(false);
      }
    };

    fetchPdfAsBlob();

    return () => {
      cancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [fetchCandidates]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(false);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Spin size="large" />
        </div>
      )}

      {error && (
        <div className="text-center text-white py-8">Failed to load PDF</div>
      )}

      {!error && objectUrl && (
        <Document
          key={objectUrl}
          file={objectUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          error=""
          noData=""
        >
          {numPages && (
            <div className="flex flex-col items-center gap-4 overflow-y-auto max-h-[80vh] p-4">
              {Array.from({ length: numPages }, (_, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={Math.round(600 * zoom)}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading=""
                  error=""
                  noData=""
                />
              ))}
            </div>
          )}
        </Document>
      )}
    </div>
  );
};

export default PreviewPdfViewer;
