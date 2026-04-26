const VERSION_KEY = "__ozzy_app_version";

/**
 * Compares NEXT_PUBLIC_APP_VERSION to the version stored in localStorage.
 * On mismatch, clears localStorage + sessionStorage so the user starts fresh
 * on the new deploy. Token loss is intentional — forces re-login.
 *
 * Must be called BEFORE redux-persist's persistStore() reads localStorage.
 */
export function runVersionGate(): void {
  if (typeof window === "undefined") return;

  const current = process.env.NEXT_PUBLIC_APP_VERSION;
  if (!current) return;

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(VERSION_KEY);
  } catch {
    return;
  }

  if (stored === current) return;

  try { window.localStorage.clear(); } catch {}
  try { window.sessionStorage.clear(); } catch {}

  try {
    window.localStorage.setItem(VERSION_KEY, current);
  } catch {}
}
