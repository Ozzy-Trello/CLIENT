"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Download, ZoomIn, ZoomOut, Printer } from "lucide-react";
import { CardAttachment } from "@myTypes/card";
import PreviewPdfViewer from "./pdf-viewer";
import { buildFileProxyUrl, toDirectFileUrl, isFileProxyUrl } from "@utils/file-url";
import TokenStorage from "@utils/token-storage";

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
const HEIC_EXTENSIONS = new Set(["heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "ogg", "ogv", "avi", "mkv"]);

const isHeicFile = (fileName: string, mimeType?: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  if (mimeType && /image\/(heic|heif)/i.test(mimeType)) {
    return true;
  }
  return HEIC_EXTENSIONS.has(extension);
};

const isVideoFileType = (fileName: string, mimeType?: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  if (mimeType && mimeType.startsWith("video/")) {
    return true;
  }
  return VIDEO_EXTENSIONS.has(extension);
};

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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [convertedHeicUrl, setConvertedHeicUrl] = useState<string>("");
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [heicConversionError, setHeicConversionError] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef({ diffX: 0, diffY: 0 });
  const contentRef = useRef<HTMLDivElement | null>(null);

  const totalAttachments = attachments.length;
  const safeCurrentIndex = useMemo(() => {
    if (totalAttachments === 0) return 0;
    return ((currentIndex % totalAttachments) + totalAttachments) % totalAttachments;
  }, [currentIndex, totalAttachments]);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      overlayRef.current?.focus();
    }
  }, [initialIndex, open]);

  // Reset zoom and offset when navigating between attachments
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
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

  // Reset offset when zoom returns to 1x or below
  useEffect(() => {
    if (zoom <= 1) setOffset({ x: 0, y: 0 });
  }, [zoom]);

  const handleImgMouseDown = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (zoom <= 1 || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragStartRef.current = {
        diffX: e.pageX - offset.x,
        diffY: e.pageY - offset.y,
      };
      setIsMoving(true);
    },
    [zoom, offset],
  );

  useEffect(() => {
    if (!isMoving) return;

    const onMouseMove = (e: MouseEvent) => {
      setOffset({
        x: e.pageX - dragStartRef.current.diffX,
        y: e.pageY - dragStartRef.current.diffY,
      });
    };

    const onMouseUp = () => {
      setIsMoving(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isMoving]);

  // Mouse wheel zoom on content area
  useEffect(() => {
    const el = contentRef.current;
    if (!open || !el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((prev) => {
        const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, parseFloat((prev + delta).toFixed(2))));
        if (next <= 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  const handlePrint = useCallback(async (url: string, asPdf: boolean) => {
    if (!url) return;

    if (!asPdf) {
      // Image printing: write an HTML doc with just the image
      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        return;
      }

      const escapedUrl = url.replace(/"/g, "&quot;");
      doc.open();
      doc.write(
        `<!doctype html><html><head><title>Print Image</title><style>html,body{margin:0;padding:0;}img{display:block;max-width:100%;height:auto;margin:0 auto;}</style></head><body><img id="print-image" src="${escapedUrl}" /><script>const i=document.getElementById("print-image");if(i){i.onload=()=>window.print();}setTimeout(()=>window.print(),2000);</script></body></html>`
      );
      doc.close();

      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 10000);
      return;
    }

    // PDF printing: fetch with auth, create blob URL, load in iframe, print natively
    try {
      const normalizedUrl = toDirectFileUrl(url);
      const accessToken = TokenStorage.getAccessToken();
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const backendBaseUrl = process.env.NEXT_PUBLIC_BE_BASE_URL || "";
      let fetchUrl = normalizedUrl;
      if (backendBaseUrl && normalizedUrl.includes(backendBaseUrl)) {
        fetchUrl = normalizedUrl;
      } else if (/^https?:\/\//i.test(normalizedUrl) || isFileProxyUrl(url)) {
        fetchUrl = buildFileProxyUrl(normalizedUrl || url);
      }

      const response = await fetch(fetchUrl, {
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });

      if (!response.ok) {
        console.error("PDF print fetch failed:", response.status, response.statusText);
        return;
      }

      const blob = await response.blob();
      const pdfBlob =
        blob.type.includes("pdf") ? blob : new Blob([blob], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Create a hidden iframe pointing directly at the PDF blob URL.
      // The browser's native PDF viewer renders it, then we call print() on it.
      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
      document.body.appendChild(iframe);
      iframe.src = blobUrl;

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            // Cross-origin fallback: open in new tab for manual print
            window.open(blobUrl);
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          }, 5000);
        }, 300);
      };

      iframe.onerror = () => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
        console.error("PDF iframe failed to load");
      };
    } catch (error) {
      console.error("PDF print failed:", error);
    }
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

  const currentAttachment = attachments[safeCurrentIndex];
  const fileName = currentAttachment?.file?.name || "Attachment";
  const fileUrl = currentAttachment?.file?.url || "";
  const directFileUrl = toDirectFileUrl(fileUrl);
  const fileMimeType = currentAttachment?.file?.mimeType;
  const activeUrl = directFileUrl || fileUrl;

  const image = isImageFile(fileName, fileMimeType);
  const pdf = isPDFFile(fileName, fileMimeType);
  const video = isVideoFileType(fileName, fileMimeType);
  const heic = isHeicFile(fileName, fileMimeType);
  const activeImageUrl = heic ? convertedHeicUrl : activeUrl;
  const canPrint = !!(pdf || (image && activeImageUrl && !video));
  const canZoom = !!(pdf || (image && activeImageUrl && !video));

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl = "";

    if (!heic || !activeUrl) {
      setConvertedHeicUrl("");
      setIsConvertingHeic(false);
      setHeicConversionError(false);
      return;
    }

    const run = async () => {
      setIsConvertingHeic(true);
      setHeicConversionError(false);
      setConvertedHeicUrl("");

      const accessToken = TokenStorage.getAccessToken();
      const authHeaders = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined;
      const normalizedUrl = toDirectFileUrl(activeUrl);
      const backendBaseUrl = process.env.NEXT_PUBLIC_BE_BASE_URL || "";

      const candidates: Array<{ fetchUrl: string; headers?: Record<string, string> }> = [];
      const seen = new Set<string>();
      const pushCandidate = (fetchUrl: string, headers?: Record<string, string>) => {
        if (!fetchUrl) return;
        const key = `${fetchUrl}::${headers?.Authorization ? "auth" : "noauth"}`;
        if (seen.has(key)) return;
        seen.add(key);
        candidates.push({ fetchUrl, headers });
      };

      if (backendBaseUrl && normalizedUrl.includes(backendBaseUrl)) {
        pushCandidate(normalizedUrl, authHeaders);
      } else if (/^https?:\/\//i.test(normalizedUrl)) {
        pushCandidate(normalizedUrl);
        pushCandidate(buildFileProxyUrl(normalizedUrl), authHeaders);
      } else if (isFileProxyUrl(activeUrl)) {
        pushCandidate(buildFileProxyUrl(activeUrl), authHeaders);
      } else {
        pushCandidate(normalizedUrl, authHeaders);
      }

      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate.fetchUrl, {
            headers: candidate.headers || {},
          });
          if (!response.ok) {
            continue;
          }

          const sourceBlob = await response.blob();
          const { default: heic2any } = await import("heic2any");
          const converted = await heic2any({
            blob: sourceBlob,
            toType: "image/jpeg",
            quality: 0.92,
          });

          const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
          if (!convertedBlob) {
            continue;
          }

          createdObjectUrl = URL.createObjectURL(convertedBlob as Blob);

          if (!cancelled) {
            setConvertedHeicUrl(createdObjectUrl);
            setIsConvertingHeic(false);
            return;
          }
          break;
        } catch {
          continue;
        }
      }

      if (!cancelled) {
        setHeicConversionError(true);
        setIsConvertingHeic(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [activeUrl, heic]);

  const iconButtonClass =
    "p-2 rounded-full hover:bg-white/20 transition-colors text-white disabled:opacity-40 disabled:cursor-not-allowed";

  if (!open || totalAttachments === 0) {
    return null;
  }

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
            disabled={zoom <= ZOOM_MIN || !canZoom}
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
            disabled={zoom >= ZOOM_MAX || !canZoom}
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
            disabled={!canPrint}
            onClick={(e) => {
              e.stopPropagation();
              handlePrint(pdf ? activeUrl : activeImageUrl, pdf);
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
        ref={contentRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden"
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
          className="inline-flex items-center justify-center p-4"
          style={{ minWidth: "100%", minHeight: "100%" }}
        >
          {image && !heic && activeImageUrl && (
            <img
              ref={imgRef}
              src={activeUrl}
              alt={fileName}
              draggable={false}
              onMouseDown={handleImgMouseDown}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isMoving ? "none" : "transform 0.15s ease",
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: 4,
                cursor: zoom > 1 ? (isMoving ? "grabbing" : "grab") : "default",
                userSelect: "none",
              }}
            />
          )}

          {image && heic && isConvertingHeic && (
            <div className="text-white text-center">
              <p className="text-lg">Converting HEIC...</p>
              <p className="text-sm text-gray-400">{fileName}</p>
            </div>
          )}

          {image && heic && !isConvertingHeic && !!activeImageUrl && (
            <img
              ref={imgRef}
              src={activeImageUrl}
              alt={fileName}
              draggable={false}
              onMouseDown={handleImgMouseDown}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isMoving ? "none" : "transform 0.15s ease",
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: 4,
                cursor: zoom > 1 ? (isMoving ? "grabbing" : "grab") : "default",
                userSelect: "none",
              }}
            />
          )}

          {image && heic && !isConvertingHeic && heicConversionError && (
            <div className="text-white text-center">
              <p className="text-lg">Failed to preview HEIC file</p>
              <p className="text-sm text-gray-400">You can still download it.</p>
            </div>
          )}

          {pdf && activeUrl && (
            <PreviewPdfViewer url={activeUrl} zoom={zoom} />
          )}

          {video && activeUrl && (
            <video
              src={activeUrl}
              controls
              preload="metadata"
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                borderRadius: 4,
                backgroundColor: "#000",
              }}
            />
          )}

          {!image && !pdf && !video && (
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
