/**
 * PDF QR Code Utility
 * Adds QR codes to existing PDFs using pdf-lib
 * Similar to the canvas-based approach used for images
 */

import { PDFDocument, rgb, PDFPage } from "pdf-lib";
import QRCode from "qrcode";

export interface PDFQROptions {
  qrText: string;
  qrSize?: number;
  position?:
    | "bottom-right"
    | "bottom-left"
    | "top-right"
    | "top-left"
    | "custom";
  customX?: number;
  customY?: number;
  padding?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  label?: string;
  labelFontSize?: number;
}

/**
 * Fetches a PDF from URL and returns the bytes
 * Handles URL proxying for external URLs and authentication for backend files
 */
export async function fetchPDFBytes(
  url: string,
  providedHeaders?: HeadersInit
): Promise<Uint8Array> {
  let fetchUrl = url;
  const headers: HeadersInit = { ...providedHeaders };

  // Determine the correct URL and headers based on the URL type
  if (url.startsWith("/api/file-proxy/")) {
    // Already a proxy URL - use provided headers
  } else if (
    url.startsWith("http") &&
    typeof window !== "undefined" &&
    !url.includes(window.location.origin)
  ) {
    // External URL, use proxy
    fetchUrl = `/api/proxy-image?url=${encodeURIComponent(url)}&inline=true`;
  }

  const response = await fetch(fetchUrl, { headers });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch PDF: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Generates a QR code as PNG bytes
 */
export async function generateQRCodePNG(
  text: string,
  size: number = 200
): Promise<Uint8Array> {
  const qrDataURL = await QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });

  // Convert data URL to bytes
  const base64Data = qrDataURL.split(",")[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Calculates QR code position on a page
 */
function calculateQRPosition(
  page: PDFPage,
  qrSize: number,
  position: string,
  padding: number,
  customX?: number,
  customY?: number
): { x: number; y: number } {
  const { width, height } = page.getSize();

  switch (position) {
    case "bottom-right":
      return {
        x: width - qrSize - padding,
        y: padding,
      };
    case "bottom-left":
      return {
        x: padding,
        y: padding,
      };
    case "top-right":
      return {
        x: width - qrSize - padding,
        y: height - qrSize - padding,
      };
    case "top-left":
      return {
        x: padding,
        y: height - qrSize - padding,
      };
    case "custom":
      // Handle percentage-based positioning (0-1) or absolute pixel values
      const x =
        customX !== undefined
          ? customX <= 1
            ? width * customX
            : customX
          : padding;
      const y =
        customY !== undefined
          ? customY <= 1
            ? height * customY
            : customY
          : padding;
      return { x, y };
    default:
      // Default to bottom-right
      return {
        x: width - qrSize - padding,
        y: padding,
      };
  }
}

/**
 * Adds QR code to all pages of a PDF
 */
export async function addQRCodeToPDF(
  pdfBytes: Uint8Array,
  options: PDFQROptions
): Promise<Uint8Array> {
  const {
    qrText,
    qrSize = 80,
    position = "bottom-right",
    customX,
    customY,
    padding = 10,
    backgroundColor = "#FFFFFF",
    borderColor = "#000000",
    borderWidth = 1,
    labelFontSize = 8,
  } = options;

  try {
    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Generate QR code as PNG
    const qrPngBytes = await generateQRCodePNG(qrText, qrSize);
    const qrImage = await pdfDoc.embedPng(qrPngBytes);

    // Add QR code to each page
    pages.forEach((page) => {
      const { x, y } = calculateQRPosition(
        page,
        qrSize,
        position,
        padding,
        customX,
        customY
      );

      // Draw background rectangle with slight transparency
      if (backgroundColor !== "transparent") {
        const bgColor =
          backgroundColor === "#FFFFFF" ? rgb(1, 1, 1) : rgb(0.95, 0.95, 0.95); // Light gray fallback

        page.drawRectangle({
          x: x - padding / 2,
          y: y - padding / 2,
          width: qrSize + padding,
          height: qrSize + padding,
          color: bgColor,
          opacity: 0.9,
        });
      }

      // Draw border
      if (borderWidth > 0) {
        const borderRgb =
          borderColor === "#000000" ? rgb(0, 0, 0) : rgb(0.3, 0.3, 0.3); // Dark gray fallback

        page.drawRectangle({
          x: x - padding / 2,
          y: y - padding / 2,
          width: qrSize + padding,
          height: qrSize + padding,
          borderColor: borderRgb,
          borderWidth: borderWidth,
        });
      }

      // Draw QR code
      page.drawImage(qrImage, {
        x: x,
        y: y,
        width: qrSize,
        height: qrSize,
      });
    });

    // Return the modified PDF as bytes
    return await pdfDoc.save();
  } catch (error) {
    console.error("Error adding QR code to PDF:", error);
    throw new Error(
      `Failed to add QR code to PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Downloads a PDF with QR code added
 */
export async function downloadPDFWithQR(
  pdfUrl: string,
  fileName: string,
  qrText: string,
  options?: Partial<PDFQROptions>,
  providedHeaders?: HeadersInit
): Promise<void> {
  try {
    // Prepare headers with proper authentication
    const headers: HeadersInit = { ...providedHeaders };

    // Fetch the original PDF with proper URL handling
    const pdfBytes = await fetchPDFBytes(pdfUrl, headers);

    // Add QR code
    const modifiedPdfBytes = await addQRCodeToPDF(pdfBytes, {
      qrText,
      ...options,
    });

    // Create blob and download
    const blob = new Blob([new Uint8Array(modifiedPdfBytes)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading PDF with QR:", error);
    throw error;
  }
}

/**
 * Opens a PDF with QR code in a new tab for printing
 */
export async function printPDFWithQR(
  pdfUrl: string,
  fileName: string,
  qrText: string,
  options?: Partial<PDFQROptions>,
  providedHeaders?: HeadersInit
): Promise<void> {
  try {
    // Prepare headers with proper authentication
    const headers: HeadersInit = { ...providedHeaders };

    // Fetch the original PDF with proper URL handling
    const pdfBytes = await fetchPDFBytes(pdfUrl, headers);

    // Add QR code
    const modifiedPdfBytes = await addQRCodeToPDF(pdfBytes, {
      qrText,
      ...options,
    });

    // Create blob and open in new tab
    const blob = new Blob([new Uint8Array(modifiedPdfBytes)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);

    // Open in new tab for printing
    const printWindow = window.open(url, "_blank");

    if (printWindow) {
      // Wait for PDF to load, then trigger print dialog
      printWindow.addEventListener("load", () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      });
    }

    // Clean up after a delay (to allow printing)
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  } catch (error) {
    console.error("Error printing PDF with QR:", error);
    throw error;
  }
}
