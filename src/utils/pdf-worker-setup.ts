/**
 * PDF.js Worker Setup Utility
 * Handles proper worker configuration for different environments
 */

import { pdfjs } from "react-pdf";

let workerInitialized = false;

export function setupPDFWorker() {
  if (workerInitialized) return;

  try {
    // Use the bundled worker served from /public.
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      pdfjs.GlobalWorkerOptions.workerSrc = `${baseUrl}/pdf.worker.min.js`;
    } else {
      // SSR fallback.
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    workerInitialized = true;
  } catch (error) {
    console.error("Failed to setup PDF.js worker:", error);
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    workerInitialized = true;
  }
}

// Auto-setup when module is imported
setupPDFWorker();
