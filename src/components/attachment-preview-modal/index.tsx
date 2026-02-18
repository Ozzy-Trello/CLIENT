"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";
import { CardAttachment } from "@myTypes/card";
import PreviewPdfViewer from "./pdf-viewer";
import { toDirectFileUrl } from "@utils/file-url";

interface AttachmentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  attachments: CardAttachment[];
  initialIndex: number;
  isImageFile: (fileName: string, mimeType?: string) => boolean;
  isPDFFile: (fileName: string, mimeType?: string) => boolean;
  onDownload?: (url?: string, fileName?: string) => void;
}

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
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const totalAttachments = attachments.length;
  const safeCurrentIndex = useMemo(() => {
    if (totalAttachments === 0) return 0;
    return ((currentIndex % totalAttachments) + totalAttachments) % totalAttachments;
  }, [currentIndex, totalAttachments]);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      overlayRef.current?.focus();
    }
  }, [initialIndex, open]);

  const goNext = useCallback(() => {
    if (totalAttachments === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalAttachments);
  }, [totalAttachments]);

  const goPrev = useCallback(() => {
    if (totalAttachments === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalAttachments) % totalAttachments);
  }, [totalAttachments]);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [goNext, goPrev, onClose, open]);

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

  const image = isImageFile(fileName, fileMimeType);
  const pdf = isPDFFile(fileName, fileMimeType);

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-[9999] flex flex-col bg-black/80 outline-none"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/60 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium truncate max-w-[400px]">{fileName}</span>
          <span className="text-xs text-gray-300">
            {safeCurrentIndex + 1} / {totalAttachments}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onDownload && fileUrl && (
            <button
              type="button"
              className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(directFileUrl || fileUrl, fileName);
              }}
              aria-label="Download"
            >
              <Download size={20} />
            </button>
          )}
          <button
            type="button"
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {totalAttachments > 1 && (
          <button
            type="button"
            className="absolute left-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous attachment"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center">
          {image && (directFileUrl || fileUrl) && (
            <img
              src={directFileUrl || fileUrl}
              alt={fileName}
              className="max-w-full max-h-[85vh] object-contain rounded"
              draggable={false}
            />
          )}
          {pdf && (directFileUrl || fileUrl) && (
            <PreviewPdfViewer url={directFileUrl || fileUrl} />
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
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next attachment"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AttachmentPreviewModal;
