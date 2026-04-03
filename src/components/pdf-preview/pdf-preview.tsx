import React, { useState, useCallback, useMemo } from "react";
import { Spin, message } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import TokenStorage from "@utils/token-storage";
import { buildFileProxyUrl, isFileProxyUrl, toDirectFileUrl } from "@utils/file-url";
import { setupPDFWorker } from "@utils/pdf-worker-setup";

interface PDFPreviewProps {
  url: string;
  fileName?: string;
  width?: number;
  height?: number;
  className?: string;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({
  url,
  fileName = "PDF",
  width = 80,
  height = 60,
  className = "",
}) => {
  const [pdfModule, setPdfModule] = useState<{
    Document: any;
    Page: any;
  } | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const loadPdfModule = async () => {
      try {
        const mod = await import("react-pdf");
        setupPDFWorker(mod.pdfjs as any);
        if (!cancelled) {
          setPdfModule({ Document: mod.Document, Page: mod.Page });
        }
      } catch (moduleError) {
        if (!cancelled) {
          console.error("Failed to load react-pdf module:", moduleError);
          setError(true);
          setLoading(false);
        }
      }
    };

    void loadPdfModule();

    return () => {
      cancelled = true;
    };
  }, []);

  // Determine the correct URL and options for PDF loading
  const { pdfUrl, options } = useMemo(() => {
    const normalizedUrl = toDirectFileUrl(url);
    let resolvedPdfUrl = normalizedUrl;
    const resolvedOptions: any = {};
    const accessToken = TokenStorage.getAccessToken();
    const backendBaseUrl = process.env.NEXT_PUBLIC_BE_BASE_URL || "";

    // Check if this is a file from our backend that needs authentication
    if (backendBaseUrl && normalizedUrl.includes(backendBaseUrl)) {
      // For backend files, add auth headers
      if (accessToken) {
        resolvedOptions.httpHeaders = {
          Authorization: `Bearer ${accessToken}`,
        };
      }
    } else if (/^https?:\/\//i.test(normalizedUrl) || isFileProxyUrl(url)) {
      // External files in thumbnails should always go through same-origin proxy.
      resolvedPdfUrl = buildFileProxyUrl(normalizedUrl || url);
      if (accessToken) {
        resolvedOptions.httpHeaders = {
          Authorization: `Bearer ${accessToken}`,
        };
      }
    }

    return { pdfUrl: resolvedPdfUrl, options: resolvedOptions };
  }, [url]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setLoading(false);
      setError(false);
    },
    []
  );

  const onDocumentLoadError = useCallback(
    (error: Error) => {
      console.error("PDF load error:", error);
      setError(true);
      setLoading(false);
      // message.error(`Failed to load PDF: ${fileName}`);
    },
    [fileName]
  );

  const onPageLoadError = useCallback((error: Error) => {
    console.error("PDF page load error:", error);
    setError(true);
    setLoading(false);
  }, []);

  // If there's an error, show the default PDF icon
  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
        style={{ width, height }}
      >
        <FilePdfOutlined className="text-red-500 text-2xl" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded ${className}`}
      style={{ width, height }}
    >
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          style={{ width, height }}
        >
          <Spin size="small" />
        </div>
      )}

      {pdfModule ? (
      <pdfModule.Document
        key={pdfUrl}
        file={pdfUrl}
        options={options}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading=""
        error=""
        noData=""
        className="react-pdf__Document"
      >
        <pdfModule.Page
          pageNumber={1}
          width={width}
          height={height}
          onLoadError={onPageLoadError}
          loading=""
          error=""
          noData=""
          className="react-pdf__Page"
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </pdfModule.Document>
      ) : null}

      {/* Page count indicator */}
      {numPages && numPages > 1 && !loading && (
        <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
          {numPages}p
        </div>
      )}
    </div>
  );
};

export default PDFPreview;
