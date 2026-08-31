const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const REMEMBER_ME_KEY = "rememberMe";

let storageListenerRegistered = false;

const hydrateFromPersistentStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (accessToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

const registerStorageSync = () => {
  if (typeof window === "undefined" || storageListenerRegistered) {
    return;
  }

  storageListenerRegistered = true;

  window.addEventListener("storage", (event: StorageEvent) => {
    if (!event.key) {
      return;
    }

    const keysToSync = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY];
    if (keysToSync.includes(event.key)) {
      if (event.newValue) {
        sessionStorage.setItem(event.key, event.newValue);
      } else {
        sessionStorage.removeItem(event.key);
      }
    }

    if (event.key === REMEMBER_ME_KEY && event.newValue === null) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  });
};

const clearLegacyCookies = () => {
  if (typeof document !== "undefined") {
    document.cookie = `${ACCESS_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${REFRESH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
};

const TokenStorage = {
  initialize() {
    if (typeof window === "undefined") {
      return;
    }

    hydrateFromPersistentStorage();
    registerStorageSync();
    clearLegacyCookies();
  },

  setTokens(accessToken: string, refreshToken: string, rememberMe?: boolean) {
    if (typeof window === "undefined") {
      return;
    }

    const shouldRemember =
      typeof rememberMe === "boolean" ? rememberMe : this.getRememberMePreference();

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(REMEMBER_ME_KEY, shouldRemember.toString());

    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    registerStorageSync();
    clearLegacyCookies();
  },

  getAccessToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (sessionToken) {
      return sessionToken;
    }

    const localToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (localToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, localToken);
    }

    return localToken;
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    const sessionToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (sessionToken) {
      return sessionToken;
    }

    const localToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (localToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, localToken);
    }

    return localToken;
  },

  clearTokens() {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (
        key?.startsWith("ozzy_comment_review_grace:")
        || key?.startsWith("ozzy_comment_gate_deferral:")
      ) {
        localStorage.removeItem(key);
      }
    }

    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);

    clearLegacyCookies();
  },

  getRememberMePreference(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem(REMEMBER_ME_KEY) === "true";
  },
};

export default TokenStorage;
