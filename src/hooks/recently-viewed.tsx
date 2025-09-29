import { useState, useEffect, useCallback } from 'react';
import RecentlyViewedStorage, { 
  RecentlyViewedCard, 
  RecentlyViewedBoard, 
  RecentlyViewedItem 
} from '@utils/recently-viewed-storage';

export interface UseRecentlyViewedReturn {
  recentlyViewedItems: RecentlyViewedItem[];
  recentlyViewedCards: RecentlyViewedCard[];
  recentlyViewedBoards: RecentlyViewedBoard[];
  addRecentlyViewedCard: (card: Omit<RecentlyViewedCard, 'viewedAt' | 'type'>) => void;
  addRecentlyViewedBoard: (board: Omit<RecentlyViewedBoard, 'viewedAt' | 'type'>) => void;
  clearAllRecentlyViewed: () => void;
  clearRecentlyViewedCards: () => void;
  clearRecentlyViewedBoards: () => void;
  refreshRecentlyViewed: () => void;
}

export const useRecentlyViewed = (): UseRecentlyViewedReturn => {
  const [recentlyViewedItems, setRecentlyViewedItems] = useState<RecentlyViewedItem[]>([]);
  const [recentlyViewedCards, setRecentlyViewedCards] = useState<RecentlyViewedCard[]>([]);
  const [recentlyViewedBoards, setRecentlyViewedBoards] = useState<RecentlyViewedBoard[]>([]);

  // Load recently viewed items from cookies on mount
  const loadRecentlyViewed = useCallback(() => {
    const allItems = RecentlyViewedStorage.getAllRecentlyViewed();
    const cards = RecentlyViewedStorage.getRecentlyViewedCards();
    const boards = RecentlyViewedStorage.getRecentlyViewedBoards();
    
    setRecentlyViewedItems(allItems);
    setRecentlyViewedCards(cards);
    setRecentlyViewedBoards(boards);
  }, []);

  // Load on mount
  useEffect(() => {
    loadRecentlyViewed();
  }, [loadRecentlyViewed]);

  // Add recently viewed card
  const addRecentlyViewedCard = useCallback((card: Omit<RecentlyViewedCard, 'viewedAt' | 'type'>) => {
    RecentlyViewedStorage.addRecentlyViewedCard(card);
    loadRecentlyViewed(); // Refresh state after adding
  }, [loadRecentlyViewed]);

  // Add recently viewed board
  const addRecentlyViewedBoard = useCallback((board: Omit<RecentlyViewedBoard, 'viewedAt' | 'type'>) => {
    RecentlyViewedStorage.addRecentlyViewedBoard(board);
    loadRecentlyViewed(); // Refresh state after adding
  }, [loadRecentlyViewed]);

  // Clear all recently viewed items
  const clearAllRecentlyViewed = useCallback(() => {
    RecentlyViewedStorage.clearAll();
    loadRecentlyViewed(); // Refresh state after clearing
  }, [loadRecentlyViewed]);

  // Clear recently viewed cards only
  const clearRecentlyViewedCards = useCallback(() => {
    RecentlyViewedStorage.clearCards();
    loadRecentlyViewed(); // Refresh state after clearing
  }, [loadRecentlyViewed]);

  // Clear recently viewed boards only
  const clearRecentlyViewedBoards = useCallback(() => {
    RecentlyViewedStorage.clearBoards();
    loadRecentlyViewed(); // Refresh state after clearing
  }, [loadRecentlyViewed]);

  // Refresh recently viewed items (useful for manual refresh)
  const refreshRecentlyViewed = useCallback(() => {
    loadRecentlyViewed();
  }, [loadRecentlyViewed]);

  return {
    recentlyViewedItems,
    recentlyViewedCards,
    recentlyViewedBoards,
    addRecentlyViewedCard,
    addRecentlyViewedBoard,
    clearAllRecentlyViewed,
    clearRecentlyViewedCards,
    clearRecentlyViewedBoards,
    refreshRecentlyViewed,
  };
};

export default useRecentlyViewed;