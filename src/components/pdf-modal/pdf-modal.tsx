import React, { useMemo, useState, useEffect } from "react";
import { Modal, Spin } from "antd";
import TokenStorage from "@utils/token-storage";
import { buildFileProxyUrl, isFileProxyUrl, toDirectFileUrl } from "@utils/file-url";

interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  fileName: string;
}

const PDFModal: React.FC<PDFModalProps> = ({
  isOpen,
  onClose,
  url,
  fileName,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Clean up object URL when modal closes or URL changes
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  // Fetch PDF and create object URL
  useEffect(() => {
    if (!isOpen || !url) return;

    const fetchPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const normalizedUrl = toDirectFileUrl(url);
        const accessToken = TokenStorage.getAccessToken();
        const authHeaders: HeadersInit = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {};
        const backendBaseUrl = process.env.NEXT_PUBLIC_BE_BASE_URL || "";

        const fetchCandidates: Array<{ fetchUrl: string; headers?: HeadersInit }> = [];

        if (backendBaseUrl && normalizedUrl.includes(backendBaseUrl)) {
          fetchCandidates.push({ fetchUrl: normalizedUrl, headers: authHeaders });
        } else if (/^https?:\/\//i.test(normalizedUrl)) {
          fetchCandidates.push({ fetchUrl: normalizedUrl });
          fetchCandidates.push({
            fetchUrl: buildFileProxyUrl(normalizedUrl),
            headers: authHeaders,
          });
        } else if (isFileProxyUrl(url)) {
          fetchCandidates.push({
            fetchUrl: buildFileProxyUrl(url),
            headers: authHeaders,
          });
        } else {
          fetchCandidates.push({ fetchUrl: normalizedUrl, headers: authHeaders });
        }

        let response: Response | null = null;
        for (const candidate of fetchCandidates) {
          try {
            const candidateResponse = await fetch(candidate.fetchUrl, {
              headers: candidate.headers,
            });
            if (candidateResponse.ok) {
              response = candidateResponse;
              break;
            }
          } catch {
            continue;
          }
        }

        if (!response) {
          throw new Error("Failed to fetch PDF");
        }

        const blob = await response.blob();

        // Ensure it's a PDF blob
        if (
          !blob.type.includes("pdf") &&
          !blob.type.includes("application/pdf")
        ) {
          // Force PDF content type
          const pdfBlob = new Blob([blob], { type: "application/pdf" });
          const newObjectUrl = URL.createObjectURL(pdfBlob);
          setObjectUrl(newObjectUrl);
        } else {
          const newObjectUrl = URL.createObjectURL(blob);
          setObjectUrl(newObjectUrl);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching PDF:", err);
        setError(err instanceof Error ? err.message : "Failed to load PDF");
        setLoading(false);
      }
    };

    fetchPDF();
  }, [isOpen, url]);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      setLoading(true);
      setError(null);
    }
  }, [isOpen, objectUrl]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .pdf-modal .ant-modal-content {
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .pdf-modal .ant-modal-body {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .pdf-modal iframe {
            border: none !important;
            outline: none !important;
          }
        `,
        }}
      />

      <Modal
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width="95vw"
        style={{ top: 10 }}
        styles={{
          body: {
            padding: 0,
            display: "flex",
            flexDirection: "column",
          },
        }}
        className="pdf-modal"
        title={fileName || "Document Viewer"}
        destroyOnHidden
      >
        <div className="flex-1 relative">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Spin size="large" />
              <span className="ml-2">Loading PDF...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-500 mb-2">Error loading PDF</p>
                <p className="text-gray-500 text-sm">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && objectUrl && (
            <iframe
              src={`${objectUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&pagemode=none`}
              className="w-full h-full border-0"
              title={fileName || "PDF Document"}
              style={{
                border: "none",
                outline: "none",
              }}
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default PDFModal;
