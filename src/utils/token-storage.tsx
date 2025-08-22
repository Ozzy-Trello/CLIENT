class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  static setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      
      // Clear any existing cookies for backward compatibility
      this.clearLegacyCookies();
    }
  }

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      
      // Clear any existing cookies for backward compatibility
      this.clearLegacyCookies();
    }
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