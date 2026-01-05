/**
 * PDF.js Worker Setup Utility
 * Handles proper worker configuration for different environments
 */

import { pdfjs } from 'react-pdf';

let workerInitialized = false;

export function setupPDFWorker() {
  if (workerInitialized) return;

  try {
    // Try to use local worker file first (pdfjs 5.x uses the .mjs worker)
    const localWorkerPath = '/pdf.worker.min.mjs';

    // In production, use absolute URL to avoid issues with routing
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      pdfjs.GlobalWorkerOptions.workerSrc = `${baseUrl}${localWorkerPath}`;
    } else {
      // Fallback for SSR or when window is not available
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    workerInitialized = true;
    console.log('✅ PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc);
  } catch (error) {
    console.error('❌ Failed to setup PDF.js worker:', error);
    // Fallback to CDN
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    workerInitialized = true;
  }
}

// Auto-setup when module is imported
setupPDFWorker();
