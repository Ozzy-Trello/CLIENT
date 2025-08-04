import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface CardFocusContextType {
  focusedCardId: string | null;
  setFocusedCardId: (cardId: string | null) => void;
  isCardFocused: (cardId: string) => boolean;
  clearFocus: () => void;
}

const CardFocusContext = createContext<CardFocusContextType | undefined>(undefined);

interface CardFocusProviderProps {
  children: ReactNode;
}

export const CardFocusProvider: React.FC<CardFocusProviderProps> = ({ children }) => {
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  const isCardFocused = (cardId: string) => {
    return focusedCardId === cardId;
  };

  const clearFocus = () => {
    setFocusedCardId(null);
  };

  // Add click outside functionality
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if the click is outside of any card or context menu
      if (!target.closest('[data-card-id]') && 
          !target.closest('.ant-dropdown') && 
          !target.closest('.ant-popover') &&
          focusedCardId) {
        clearFocus();
      }
    };

    if (focusedCardId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [focusedCardId]);

  const value = {
    focusedCardId,
    setFocusedCardId,
    isCardFocused,
    clearFocus,
  };

  return (
    <CardFocusContext.Provider value={value}>
      {children}
    </CardFocusContext.Provider>
  );
};

export const useCardFocus = () => {
  const context = useContext(CardFocusContext);
  if (context === undefined) {
    throw new Error('useCardFocus must be used within a CardFocusProvider');
  }
  return context;
};