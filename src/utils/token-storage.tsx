class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly REMEMBER_ME_KEY = 'rememberMe';

  static setTokens(accessToken: string, refreshToken: string, rememberMe: boolean = false): void {
    if (typeof window !== 'undefined') {
      // Choose storage based on remember me preference
      const storage = rememberMe ? localStorage : sessionStorage;
      
      storage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      storage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      
      // Store remember me preference in localStorage for persistence
      localStorage.setItem(this.REMEMBER_ME_KEY, rememberMe.toString());
      
      // Clear tokens from the other storage to avoid conflicts
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem(this.ACCESS_TOKEN_KEY);
      otherStorage.removeItem(this.REFRESH_TOKEN_KEY);
      
      // Clear any existing cookies for backward compatibility
      this.clearLegacyCookies();
    }
  }

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Check if remember me was enabled
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // First try the preferred storage, then fallback to the other
    return storage.getItem(this.ACCESS_TOKEN_KEY) || 
           (rememberMe ? sessionStorage : localStorage).getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Check if remember me was enabled
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // First try the preferred storage, then fallback to the other
    return storage.getItem(this.REFRESH_TOKEN_KEY) || 
           (rememberMe ? sessionStorage : localStorage).getItem(this.REFRESH_TOKEN_KEY);
  }

  static clearTokens(): void {
    if (typeof window !== 'undefined') {
      // Clear from both localStorage and sessionStorage
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.REMEMBER_ME_KEY);
      
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
      
      // Clear any existing cookies for backward compatibility
      this.clearLegacyCookies();
    }
  }

  static getRememberMePreference(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
  }

  // Helper method to clear legacy cookies
  private static clearLegacyCookies(): void {
    if (typeof document !== 'undefined') {
      // Clear access token cookie
      document.cookie = `${this.ACCESS_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      // Clear refresh token cookie
      document.cookie = `${this.REFRESH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      // Clear any other common token cookie names
      document.cookie = `accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  }


}

export default TokenStorage;