/**
 * PDF.js Worker Setup Utility
 * Handles proper worker configuration for different environments
 */

let workerInitialized = false;

export async function setupPDFWorker() {
  if (workerInitialized) return;

  try {
    if (typeof window === "undefined") return;

    const { pdfjs } = await import("react-pdf");
    const baseUrl = window.location.origin;
    pdfjs.GlobalWorkerOptions.workerSrc = `${baseUrl}/pdf.worker.min.mjs`;

    workerInitialized = true;
  } catch (error) {
    console.error("Failed to setup PDF.js worker:", error);
    try {
      const { pdfjs } = await import("react-pdf");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      workerInitialized = true;
    } catch {
      workerInitialized = true;
    }
  }
}
