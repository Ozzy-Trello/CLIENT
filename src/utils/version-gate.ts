const VERSION_KEY = "__ozzy_app_version";

/**
 * Compares NEXT_PUBLIC_APP_VERSION to the version stored in localStorage.
 * On mismatch, clears cached state and tokens while keeping unsent Daily
 * Activity text in this tab. Token loss is intentional — forces re-login.
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
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key && !key.startsWith("ozzy_daily_activity_draft_v1:")) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {}

  try {
    window.localStorage.setItem(VERSION_KEY, current);
  } catch {}
}
