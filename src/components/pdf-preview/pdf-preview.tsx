import React, { useState, useCallback, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import { Spin, message } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import TokenStorage from '@utils/token-storage';
import '@utils/pdf-worker-setup'; // Initialize PDF.js worker

interface PDFPreviewProps {
  url: string;
  fileName?: string;
  width?: number;
  height?: number;
  className?: string;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({
  url,
  fileName = 'PDF',
  width = 80,
  height = 60,
  className = '',
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Determine the correct URL and options for PDF loading
  const { pdfUrl, options } = useMemo(() => {
    let pdfUrl = url;
    let options: any = {};

    // Check if this is a file from our backend that needs authentication
    if (url.includes(process.env.NEXT_PUBLIC_BE_BASE_URL || '')) {
      // For backend files, add auth headers
      const accessToken = TokenStorage.getAccessToken();
      if (accessToken) {
        options.httpHeaders = {
          Authorization: `Bearer ${accessToken}`,
        };
      }
    } else if (url.startsWith('/api/file-proxy/')) {
      // Already a proxy URL, use as is with auth
      const accessToken = TokenStorage.getAccessToken();
      if (accessToken) {
        options.httpHeaders = {
          Authorization: `Bearer ${accessToken}`,
        };
      }
    } else if (url.startsWith('http') && !url.includes(window.location.origin)) {
      // External URL, use proxy
      pdfUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }

    return { pdfUrl, options };
  }, [url]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(false);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setError(true);
    setLoading(false);
    message.error(`Failed to load PDF: ${fileName}`);
  }, [fileName]);

  const onPageLoadError = useCallback((error: Error) => {
    console.error('PDF page load error:', error);
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
      
      <Document
        file={pdfUrl}
        options={options}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading=""
        error=""
        noData=""
        className="react-pdf__Document"
      >
        <Page
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
      </Document>
      
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