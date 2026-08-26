'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'chunk-reload';
const RELOAD_PARAM = 'chunk-reload';
// How long the page must load cleanly before re-arming the one-shot reload.
const STABLE_DELAY_MS = 10_000;

function isChunkRelatedMessage(message: string): boolean {
  return (
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed')
  );
}

function reloadOnce(reason: string) {
  if (sessionStorage.getItem(RELOAD_FLAG)) {
    console.error(`Chunk load error persists after reload (${reason})`);
    return;
  }

  console.warn(`Chunk load error detected (${reason}), reloading page...`);
  sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));

  try {
    const url = new URL(window.location.href);
    url.searchParams.set(RELOAD_PARAM, Date.now().toString());
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Handles chunk load errors by reloading the page once (with a cache-busting
 * query param). This prevents white screens when new deployments invalidate
 * old chunk files. Script failures are caught in the capture phase because
 * they never surface as window error events with a usable message.
 */
export function ChunkLoadErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isChunkRelatedMessage(event.message || '')) {
        event.preventDefault?.();
        reloadOnce(event.message);
      }
    };

    const handleScriptError = (event: Event) => {
      const target = event.target as HTMLScriptElement | null;
      const src = target?.src;

      if (target && typeof src === 'string' && src.includes('/_next/')) {
        reloadOnce(src.split('/').pop() || src);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason ?? '');

      if (isChunkRelatedMessage(message)) {
        reloadOnce(message);
      }
    };

    window.addEventListener('error', handleError);
    // Capture phase: script element failures don't bubble to window.
    window.addEventListener('error', handleScriptError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Re-arm the one-shot reload only after the app has stayed up for a bit,
    // so an error moments after mount can still trigger a recovery reload.
    const stableTimer = setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
    }, STABLE_DELAY_MS);

    return () => {
      clearTimeout(stableTimer);
      window.removeEventListener('error', handleError);
      window.removeEventListener('error', handleScriptError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
