'use client';

import { useEffect } from 'react';

/**
 * Handles chunk load errors by reloading the page once.
 * This prevents white screens when new deployments invalidate old chunk files.
 */
export function ChunkLoadErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const isChunkLoadError =
        event.message.includes('Loading chunk') ||
        event.message.includes('Failed to fetch dynamically imported module') ||
        event.message.includes('Importing a module script failed');

      if (isChunkLoadError) {
        const hasReloaded = sessionStorage.getItem('chunk-reload');

        if (!hasReloaded) {
          console.warn('Chunk load error detected, reloading page...');
          sessionStorage.setItem('chunk-reload', 'true');
          window.location.reload();
        } else {
          console.error('Chunk load error persists after reload');
          sessionStorage.removeItem('chunk-reload');
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const isChunkLoadError =
        event.reason?.message?.includes('Loading chunk') ||
        event.reason?.message?.includes('Failed to fetch') ||
        event.reason?.toString().includes('ChunkLoadError');

      if (isChunkLoadError) {
        const hasReloaded = sessionStorage.getItem('chunk-reload');

        if (!hasReloaded) {
          console.warn('Chunk load error detected (promise), reloading page...');
          sessionStorage.setItem('chunk-reload', 'true');
          window.location.reload();
        } else {
          console.error('Chunk load error persists after reload');
          sessionStorage.removeItem('chunk-reload');
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Clear the reload flag after successful load
    sessionStorage.removeItem('chunk-reload');

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
