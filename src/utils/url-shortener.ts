/**
 * URL Shortener utility for QR codes
 * Maintains cardId functionality while creating shorter, more readable QR codes
 */

interface ShortUrlData {
  cardId: string;
  workspaceId: string;
  boardId: string;
  originalUrl: string;
  createdAt: number;
}

class URLShortener {
  private static readonly STORAGE_KEY = 'qr_short_urls';
  private static readonly BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

  /**
   * Generate a short URL for QR codes
   * @param cardId - The card ID to preserve
   * @param workspaceId - The workspace ID
   * @param boardId - The board ID
   * @param mode - 'stateless' for portable links, 'legacy' for localStorage-backed links
   * @returns Short URL that redirects to the full card URL
   */
  static generateShortUrl(
    cardId: string,
    workspaceId: string,
    boardId: string,
    mode: 'stateless' | 'legacy' = 'stateless'
  ): string {
    const shortUrlData: ShortUrlData = {
      cardId,
      workspaceId,
      boardId,
      originalUrl: `${this.BASE_URL}/workspace/${workspaceId}/board/${boardId}?cardId=${cardId}`,
      createdAt: Date.now()
    };

    if (mode === 'legacy') {
      // Backward-compatible localStorage-backed short ID
      const shortId = this.generateShortId();
      this.storeShortUrl(shortId, shortUrlData);
      return `${this.BASE_URL}/qr/${shortId}`;
    }

    // Stateless, portable short ID
    const shortId = this.encodeStateless({
      cardId: shortUrlData.cardId,
      workspaceId: shortUrlData.workspaceId,
      boardId: shortUrlData.boardId,
    });
    return `${this.BASE_URL}/qr/${shortId}`;
  }

  /**
   * Generate a short ID (8 characters)
   */
  private static generateShortId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Store short URL mapping in localStorage
   */
  private static storeShortUrl(shortId: string, data: ShortUrlData): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const urls = stored ? JSON.parse(stored) : {};
      urls[shortId] = data;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(urls));
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Resolve a short URL to get the original data
   */
  static resolveShortUrl(shortId: string): ShortUrlData | null {
    // Try stateless decode first (portable across browsers)
    const decoded = this.decodeStateless(shortId);
    if (decoded) {
      return decoded;
    }

    // Fallback to legacy localStorage-backed mapping
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const urls = JSON.parse(stored);
      return urls[shortId] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract cardId from either short or long URL
   * This maintains compatibility with the existing extractCardIdFromScan function
   */
  static extractCardIdFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // Check if it's a short URL (format: /qr/shortId)
      if (urlObj.pathname.startsWith('/qr/')) {
        const shortId = urlObj.pathname.split('/qr/')[1];
        const resolved = this.resolveShortUrl(shortId);
        return resolved ? resolved.cardId : null;
      }
      
      // Check for cardId parameter in regular URLs
      const cardId = urlObj.searchParams.get('cardId');
      if (cardId) {
        return cardId;
      }
      
      return null;
    } catch (error) {
      // Not a valid URL, might be a direct cardId
      return null;
    }
  }

  /**
   * Clean up old short URLs (older than 30 days)
   */
  static cleanupOldUrls(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const urls = JSON.parse(stored);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const cleaned = Object.fromEntries(
        Object.entries(urls).filter(([_, data]: [string, any]) => 
          data.createdAt > thirtyDaysAgo
        )
      );
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleaned));
    } catch (error) {
      // Silently fail if localStorage operations fail
    }
  }

  /**
   * Encode data into a portable short ID using base64url of compact JSON.
   */
  private static encodeStateless(data: { cardId: string; workspaceId: string; boardId: string }): string {
    const payload = JSON.stringify({ v: 1, c: data.cardId, w: data.workspaceId, b: data.boardId });
    const base64 = (typeof window !== 'undefined' && typeof window.btoa === 'function')
      ? window.btoa(payload)
      : Buffer.from(payload, 'utf8').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  /**
   * Decode a portable short ID back into ShortUrlData, or null if invalid.
   */
  private static decodeStateless(shortId: string): ShortUrlData | null {
    try {
      const base64 = shortId.replace(/-/g, '+').replace(/_/g, '/');
      const padLength = base64.length % 4 === 0 ? 0 : 4 - (base64.length % 4);
      const padded = base64 + '='.repeat(padLength);
      const json = (typeof window !== 'undefined' && typeof window.atob === 'function')
        ? window.atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
      const obj = JSON.parse(json);
      if (!obj || typeof obj !== 'object') return null;
      const { c: cardId, w: workspaceId, b: boardId } = obj as { c?: string; w?: string; b?: string };
      if (!cardId || !workspaceId || !boardId) return null;
      return {
        cardId,
        workspaceId,
        boardId,
        originalUrl: `${this.BASE_URL}/workspace/${workspaceId}/board/${boardId}?cardId=${cardId}`,
        createdAt: Date.now(),
      };
    } catch {
      return null;
    }
  }
}

export default URLShortener;