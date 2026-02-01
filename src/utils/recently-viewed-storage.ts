export interface RecentlyViewedCard {
  id: string;
  name: string;
  description?: string;
  boardId: string;
  boardName: string;
  listId: string;
  listName: string;
  workspaceId: string;
  viewedAt: string;
  type: 'card';
}

export interface RecentlyViewedBoard {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  workspaceName: string;
  viewedAt: string;
  type: 'board';
}

export type RecentlyViewedItem = RecentlyViewedCard | RecentlyViewedBoard;

class RecentlyViewedStorage {
  private static readonly CARDS_COOKIE_KEY = 'recentlyViewedCards';
  private static readonly BOARDS_COOKIE_KEY = 'recentlyViewedBoards';
  private static readonly MAX_ITEMS = 5;
  private static readonly COOKIE_EXPIRY_DAYS = 30;

  // Helper method to set cookie
  private static setCookie(name: string, value: string, days: number): void {
    if (typeof document === 'undefined') return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }

  // Helper method to get cookie
  private static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  // Helper method to delete cookie
  private static deleteCookie(name: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  // Get recently viewed cards
  static getRecentlyViewedCards(): RecentlyViewedCard[] {
    try {
      const stored = this.getCookie(this.CARDS_COOKIE_KEY);
      if (!stored) return [];
      
      const items: RecentlyViewedCard[] = JSON.parse(stored);
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.error('Error parsing recently viewed cards from cookies:', error);
      return [];
    }
  }

  // Get recently viewed boards
  static getRecentlyViewedBoards(): RecentlyViewedBoard[] {
    try {
      const stored = this.getCookie(this.BOARDS_COOKIE_KEY);
      if (!stored) return [];
      
      const items: RecentlyViewedBoard[] = JSON.parse(stored);
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.error('Error parsing recently viewed boards from cookies:', error);
      return [];
    }
  }

  // Add a recently viewed card
  static addRecentlyViewedCard(card: Omit<RecentlyViewedCard, 'viewedAt' | 'type'>): void {
    try {
      const currentItems = this.getRecentlyViewedCards();
      
      // Remove existing item with same ID if it exists
      const filteredItems = currentItems.filter(item => item.id !== card.id);
      
      // Add new item at the beginning
      const newItem: RecentlyViewedCard = {
        ...card,
        viewedAt: new Date().toISOString(),
        type: 'card'
      };
      
      const updatedItems = [newItem, ...filteredItems].slice(0, this.MAX_ITEMS);
      
      this.setCookie(this.CARDS_COOKIE_KEY, JSON.stringify(updatedItems), this.COOKIE_EXPIRY_DAYS);
    } catch (error) {
      console.error('Error saving recently viewed card to cookies:', error);
    }
  }

  // Add a recently viewed board
  static addRecentlyViewedBoard(board: Omit<RecentlyViewedBoard, 'viewedAt' | 'type'>): void {
    try {
      const currentItems = this.getRecentlyViewedBoards();
      
      // Remove existing item with same ID if it exists
      const filteredItems = currentItems.filter(item => item.id !== board.id);
      
      // Add new item at the beginning
      const newItem: RecentlyViewedBoard = {
        ...board,
        viewedAt: new Date().toISOString(),
        type: 'board'
      };
      
      const updatedItems = [newItem, ...filteredItems].slice(0, this.MAX_ITEMS);
      
      this.setCookie(this.BOARDS_COOKIE_KEY, JSON.stringify(updatedItems), this.COOKIE_EXPIRY_DAYS);
    } catch (error) {
      console.error('Error saving recently viewed board to cookies:', error);
    }
  }

  // Get all recently viewed items (cards and boards combined, sorted by viewedAt)
  static getAllRecentlyViewed(): RecentlyViewedItem[] {
    const cards = this.getRecentlyViewedCards();
    const boards = this.getRecentlyViewedBoards();
    
    const allItems: RecentlyViewedItem[] = [...cards, ...boards];
    
    // Sort by viewedAt (most recent first)
    return allItems
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
      .slice(0, this.MAX_ITEMS);
  }

  // Clear all recently viewed items
  static clearAll(): void {
    this.deleteCookie(this.CARDS_COOKIE_KEY);
    this.deleteCookie(this.BOARDS_COOKIE_KEY);
  }

  // Clear recently viewed cards only
  static clearCards(): void {
    this.deleteCookie(this.CARDS_COOKIE_KEY);
  }

  // Clear recently viewed boards only
  static clearBoards(): void {
    this.deleteCookie(this.BOARDS_COOKIE_KEY);
  }
}

export default RecentlyViewedStorage;