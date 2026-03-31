import React, { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { message } from "antd";
import QRCode from "react-qr-code";
import { Card } from "@myTypes/card";
import { createShortUrl, buildShortUrl } from "@api/short-url";
import URLShortener from "@utils/url-shortener";
import TokenStorage from "@utils/token-storage";
import { downloadPDFWithQR } from "@utils/pdf-qr-utils";
import apiClient from "@api/index";
import { buildFileProxyUrl, isFileProxyUrl, toDirectFileUrl } from "@utils/file-url";

interface UseAttachmentPrintingArgs {
  card: Card | null;
  workspaceId?: string | string[];
  boardId?: string | string[];
  markPrinted: (attachmentId: string) => void;
}

interface PdfSelection {
  url: string;
  fileName: string;
}

export const useAttachmentPrinting = ({
  card,
  workspaceId,
  boardId,
  markPrinted,
}: UseAttachmentPrintingArgs) => {
  const [pdfModalVisible, setPdfModalVisible] = useState<boolean>(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfSelection | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const normalizedWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId;
  const normalizedBoardId = Array.isArray(boardId) ? boardId[0] : boardId;

  const generateShortUrl = useCallback(async (): Promise<string> => {
    if (!normalizedWorkspaceId || !normalizedBoardId || !card?.id) {
      console.log("❌ Missing required data, using fallback URL");
      return window.location.href;
    }

    if (card.shortId) {
      const shortUrl = `${window.location.origin}/qr/${card.shortId}`;
      console.log("✅ Using card shortId for QR:", shortUrl);
      return shortUrl;
    }

    // Avoid relying on backend short-url API; build a deterministic URL instead
    const directUrl = `${window.location.origin}/workspace/${normalizedWorkspaceId}/board/${normalizedBoardId}?cardId=${card.id}`;

    // Stateless shortener (pure FE) to keep the QR text compact
    const legacyUrl = URLShortener.generateShortUrl(
      card.id,
      normalizedWorkspaceId,
      normalizedBoardId,
      "stateless"
    );
    console.log("⚠️ Using stateless URL shortener:", legacyUrl);
    return legacyUrl || directUrl;
  }, [card?.id, card?.shortId, normalizedBoardId, normalizedWorkspaceId]);

  const getBase64FromUrl = useCallback(async (url: string): Promise<string> => {
    try {
      const normalizedUrl = toDirectFileUrl(url);
      let fetchUrl = normalizedUrl;
      const headers: HeadersInit = {};
      const backendBaseUrl = process.env.NEXT_PUBLIC_BE_BASE_URL || "";

      if (backendBaseUrl && normalizedUrl.includes(backendBaseUrl)) {
        const accessToken = TokenStorage.getAccessToken();
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
      } else if (/^https?:\/\//i.test(normalizedUrl) || isFileProxyUrl(url)) {
        fetchUrl = buildFileProxyUrl(normalizedUrl || url);
        const accessToken = TokenStorage.getAccessToken();
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
      }

      const response = await fetch(
        fetchUrl,
        Object.keys(headers).length > 0 ? { headers } : {}
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw error;
    }
  }, []);

  const handleOpenPdfModal = useCallback((url: string, fileName: string) => {
    setSelectedPdf({ url, fileName });
    setPdfModalVisible(true);
  }, []);

  const handleClosePdfModal = useCallback(() => {
    setPdfModalVisible(false);
    setSelectedPdf(null);
  }, []);

  const handlePrintWithQR = useCallback(
    async (imageUrl?: string, fileName?: string, attachmentId?: string) => {
      if (!imageUrl) return;

      try {
        const loadingMsg = message.loading("Preparing print view...", 0);
        if (!qrCanvasRef.current) {
          qrCanvasRef.current = document.createElement("canvas");
        }
        const canvas = qrCanvasRef.current;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          message.error("Failed to create canvas context");
          loadingMsg();
          return;
        }

        const base64Image = await getBase64FromUrl(imageUrl);

        const img = document.createElement("img");
        img.crossOrigin = "anonymous";

        img.onload = async () => {
          const qrSize = Math.min(200, img.width * 0.35);
          const padding = 10;

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0, img.width, img.height);
          const qrX = Math.floor(img.width * 0.2);
          const qrY = Math.floor(img.height * 0.005);

          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.fillRect(
            qrX - padding,
            qrY - padding,
            qrSize + padding * 2,
            qrSize + padding * 2
          );
          ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
          ctx.lineWidth = 1;
          ctx.strokeRect(
            qrX - padding,
            qrY - padding,
            qrSize + padding * 2,
            qrSize + padding * 2
          );

          const qrSvg = document.createElement("div");
          qrSvg.style.position = "absolute";
          qrSvg.style.top = "-9999px";
          qrSvg.style.left = "-9999px";
          document.body.appendChild(qrSvg);
          const qrElement = document.createElement("div");
          qrElement.style.width = `${qrSize}px`;
          qrElement.style.height = `${qrSize}px`;
          qrElement.style.position = "absolute";
          qrElement.style.top = "-9999px";
          qrElement.style.left = "-9999px";
          qrElement.style.background = "white";
          document.body.appendChild(qrElement);

          const shortUrl = await generateShortUrl();
          const qrRoot = createRoot(qrElement);
          flushSync(() => {
            qrRoot.render(
              <QRCode
                value={shortUrl}
                size={qrSize}
                level="M"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            );
          });

          const svgElement = qrElement.querySelector("svg");
          if (!svgElement) {
            message.error("Failed to generate QR code");
            qrRoot.unmount();
            document.body.removeChild(qrSvg);
            document.body.removeChild(qrElement);
            loadingMsg();
            return;
          }

          const svgData = new XMLSerializer().serializeToString(svgElement);
          const qrImg = document.createElement("img");
          qrImg.src =
            "data:image/svg+xml;base64," +
            btoa(unescape(encodeURIComponent(svgData)));

          qrImg.onload = () => {
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            ctx.font = "bold 12px Arial";
            ctx.fillStyle = "black";
            ctx.textAlign = "center";

            const printFrame = document.createElement("iframe");
            printFrame.style.position = "fixed";
            printFrame.style.right = "-9999px";
            printFrame.style.bottom = "-9999px";
            printFrame.style.width = "0";
            printFrame.style.height = "0";
            printFrame.style.border = "0";
            document.body.appendChild(printFrame);

            const dataUrl = canvas.toDataURL("image/png");
            const printDocument = printFrame.contentWindow?.document;
            if (!printDocument) {
              message.error("Failed to create print document");
              qrRoot.unmount();
              document.body.removeChild(printFrame);
              document.body.removeChild(qrSvg);
              document.body.removeChild(qrElement);
              loadingMsg();
              return;
            }

            printDocument.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>${fileName || "Image"} with QR Code</title>
                <style>
                  @page {
                    margin: 0.5cm;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                  }
                  img {
                    max-width: 100%;
                    max-height: 100vh;
                    object-fit: contain;
                  }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" alt="${fileName || "Image"} with QR Code" />
              </body>
              </html>
            `);

            printDocument.close();

            const printedImg = printDocument.querySelector("img");
            if (printedImg) {
              printedImg.onload = () => {
                setTimeout(() => {
                  try {
                    printFrame.contentWindow?.focus();
                    printFrame.contentWindow?.print();
                    setTimeout(() => {
                      qrRoot.unmount();
                      document.body.removeChild(printFrame);
                      document.body.removeChild(qrSvg);
                      document.body.removeChild(qrElement);
                      loadingMsg();
                      if (attachmentId) {
                        markPrinted(attachmentId);
                      }
                    }, 1000);
                  } catch (error) {
                    document.body.removeChild(printFrame);
                    document.body.removeChild(qrSvg);
                    document.body.removeChild(qrElement);
                    loadingMsg();
                    message.error("Failed to open print dialog");
                  }
                  }, 500);
              };

              printedImg.onerror = () => {
                qrRoot.unmount();
                document.body.removeChild(printFrame);
                document.body.removeChild(qrSvg);
                document.body.removeChild(qrElement);
                loadingMsg();
                message.error("Failed to load image for printing");
              };
            } else {
              qrRoot.unmount();
              document.body.removeChild(printFrame);
              document.body.removeChild(qrSvg);
              document.body.removeChild(qrElement);
              loadingMsg();
              message.error("Failed to prepare image for printing");
            }
          };

          qrImg.onerror = () => {
            message.error("Failed to generate QR code");
            qrRoot.unmount();
            document.body.removeChild(qrSvg);
            document.body.removeChild(qrElement);
            loadingMsg();
          };
        };

        img.onerror = () => {
          message.error("Failed to load image");
          loadingMsg();
        };

        img.src = base64Image;
      } catch (error) {
        message.error("An error occurred during download");
      }
    },
    [generateShortUrl, getBase64FromUrl, markPrinted]
  );

  const handlePrintPDFWithQR = useCallback(
    async (pdfUrl?: string, fileName?: string, attachmentId?: string) => {
      if (!pdfUrl) {
        console.error("❌ PDF Print with QR: No PDF URL provided");
        message.error("No PDF URL provided");
        return;
      }

      console.log("⬇️ PDF download requested (via QR button):", {
        pdfUrl,
        fileName,
      });

      try {
        const loadingMsg = message.loading("Preparing PDF...", 0);

        const qrText = await generateShortUrl();

        // Ask backend to stream the stamped PDF directly (avoids proxy and 403)
        const token = TokenStorage.getAccessToken();
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        if (!attachmentId) {
          throw new Error("Missing attachment id for QR download");
        }

        const resp = await fetch(
          `/card-attachment/${attachmentId}/download-with-qr?qr=${encodeURIComponent(
            qrText
          )}&name=${encodeURIComponent(fileName || "attachment.pdf")}`,
          { headers }
        );

        if (!resp.ok) {
          throw new Error(`Download failed ${resp.status}: ${resp.statusText}`);
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "attachment.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        loadingMsg();
        message.success("PDF downloaded with QR");
        if (attachmentId) {
          markPrinted(attachmentId);
        }
      } catch (error) {
        console.error("❌ PDF download failed:", error);
        message.error(
          `Failed to download PDF: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    },
    [generateShortUrl, markPrinted]
  );

  return {
    handlePrintWithQR,
    handlePrintPDFWithQR,
    handleOpenPdfModal,
    handleClosePdfModal,
    pdfModalVisible,
    selectedPdf,
  };
};
