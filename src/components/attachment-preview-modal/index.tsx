"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Download, ZoomIn, ZoomOut, Printer } from "lucide-react";
import { CardAttachment } from "@myTypes/card";
import PreviewPdfViewer from "./pdf-viewer";
import { buildFileProxyUrl, toDirectFileUrl } from "@utils/file-url";

interface AttachmentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  attachments: CardAttachment[];
  initialIndex: number;
  isImageFile: (fileName: string, mimeType?: string) => boolean;
  isPDFFile: (fileName: string, mimeType?: string) => boolean;
  onDownload?: (url?: string, fileName?: string) => void;
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  open,
  onClose,
  attachments,
  initialIndex,
  isImageFile,
  isPDFFile,
  onDownload,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoom, setZoom] = useState(1);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const totalAttachments = attachments.length;
  const safeCurrentIndex = useMemo(() => {
    if (totalAttachments === 0) return 0;
    return ((currentIndex % totalAttachments) + totalAttachments) % totalAttachments;
  }, [currentIndex, totalAttachments]);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      overlayRef.current?.focus();
    }
  }, [initialIndex, open]);

  // Reset zoom when navigating between attachments
  useEffect(() => {
    setZoom(1);
  }, [safeCurrentIndex]);

  const goNext = useCallback(() => {
    if (totalAttachments === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalAttachments);
  }, [totalAttachments]);

  const goPrev = useCallback(() => {
    if (totalAttachments === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalAttachments) % totalAttachments);
  }, [totalAttachments]);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(parseFloat((prev + ZOOM_STEP).toFixed(2)), ZOOM_MAX));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(parseFloat((prev - ZOOM_STEP).toFixed(2)), ZOOM_MIN));
  }, []);

  const handlePrint = useCallback((url: string, asPdf: boolean) => {
    if (!url) return;

    const printUrl = asPdf ? `${buildFileProxyUrl(url)}&inline=true` : url;
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      return;
    }

    const escapedUrl = printUrl.replace(/"/g, "&quot;");
    const html = asPdf
      ? `<!doctype html><html><head><title>Print PDF</title><style>html,body{margin:0;padding:0;height:100%;}iframe{border:0;width:100%;height:100%;}</style></head><body><iframe id="pdf-frame" src="${escapedUrl}"></iframe><script>const f=document.getElementById("pdf-frame");if(f){f.onload=()=>setTimeout(()=>window.print(),500);}setTimeout(()=>window.print(),2000);</script></body></html>`
      : `<!doctype html><html><head><title>Print Image</title><style>html,body{margin:0;padding:0;}img{display:block;max-width:100%;height:auto;margin:0 auto;}</style></head><body><img id="print-image" src="${escapedUrl}" /><script>const i=document.getElementById("print-image");if(i){i.onload=()=>window.print();}setTimeout(()=>window.print(),2000);</script></body></html>`;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);
  }, []);

  const handleDownloadClick = useCallback(
    (url: string, name: string) => {
      if (!url) return;
      if (onDownload) {
        onDownload(url, name);
        return;
      }

      const link = document.createElement("a");
      link.href = buildFileProxyUrl(url);
      link.download = name || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [onDownload]
  );

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "Escape") {
        onClose();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
      } else if (event.key === "-") {
        event.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [goNext, goPrev, onClose, open, zoomIn, zoomOut]);

  useEffect(() => {
    if (totalAttachments === 0) return;
    if (safeCurrentIndex !== currentIndex) {
      setCurrentIndex(safeCurrentIndex);
    }
  }, [currentIndex, safeCurrentIndex, totalAttachments]);

  if (!open || totalAttachments === 0) {
    return null;
  }

  const currentAttachment = attachments[safeCurrentIndex];
  const fileName = currentAttachment?.file?.name || "Attachment";
  const fileUrl = currentAttachment?.file?.url || "";
  const directFileUrl = toDirectFileUrl(fileUrl);
  const fileMimeType = currentAttachment?.file?.mimeType;
  const activeUrl = directFileUrl || fileUrl;

  const image = isImageFile(fileName, fileMimeType);
  const pdf = isPDFFile(fileName, fileMimeType);

  const iconButtonClass =
    "p-2 rounded-full hover:bg-white/20 transition-colors text-white disabled:opacity-40 disabled:cursor-not-allowed";

  const modalContent = (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-[12000] flex flex-col bg-black/80 outline-none"
      onClick={onClose}
    >
      {/* Header toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/60 text-white shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium truncate max-w-[400px]">{fileName}</span>
          <span className="text-xs text-gray-300">
            {safeCurrentIndex + 1} / {totalAttachments}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            type="button"
            className={iconButtonClass}
            disabled={zoom <= ZOOM_MIN}
            onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            aria-label="Zoom out"
            title="Zoom out (−)"
          >
            <ZoomOut size={20} />
          </button>

          <span className="text-xs text-gray-300 w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            className={iconButtonClass}
            disabled={zoom >= ZOOM_MAX}
            onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            <ZoomIn size={20} />
          </button>

          {/* Print */}
          <button
            type="button"
            className={iconButtonClass}
            disabled={!activeUrl}
            onClick={(e) => {
              e.stopPropagation();
              handlePrint(activeUrl, pdf);
            }}
            aria-label="Print"
            title="Print"
          >
            <Printer size={20} />
          </button>

          {/* Download */}
          <button
            type="button"
            className={iconButtonClass}
            disabled={!activeUrl}
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadClick(activeUrl, fileName);
            }}
            aria-label="Download"
            title="Download"
          >
            <Download size={20} />
          </button>

          {/* Close */}
          <button
            type="button"
            className={iconButtonClass}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close preview"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {totalAttachments > 1 && (
          <button
            type="button"
            className="absolute left-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous attachment"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div
          className="flex items-center justify-center p-4"
          style={{ minWidth: "100%", minHeight: "100%" }}
        >
          {image && activeUrl && (
            <img
              src={activeUrl}
              alt={fileName}
              draggable={false}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 0.15s ease",
                maxWidth: zoom <= 1 ? "90vw" : "none",
                maxHeight: zoom <= 1 ? "85vh" : "none",
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
          )}

          {pdf && activeUrl && (
            <PreviewPdfViewer url={activeUrl} zoom={zoom} />
          )}

          {!image && !pdf && (
            <div className="text-white text-center">
              <p className="text-lg">Preview not available</p>
              <p className="text-sm text-gray-400">{fileName}</p>
            </div>
          )}
        </div>

        {totalAttachments > 1 && (
          <button
            type="button"
            className="absolute right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next attachment"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;

  return createPortal(modalContent, document.body);
};

export default AttachmentPreviewModal;
