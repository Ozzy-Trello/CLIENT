import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Card } from '@/app/dto/types';

type CardDetailContextType = {
  selectedCard: Card | null;
  setSelectedCard: React.Dispatch<React.SetStateAction<Card | null>>;
  isCardDetailOpen: boolean;
  openCardDetail: (card: Card) => void;
  closeCardDetail: () => void;
};

const CardDetailContext = createContext<CardDetailContextType>({
  selectedCard: null,
  setSelectedCard: () => {},
  isCardDetailOpen: false,
  openCardDetail: () => {},
  closeCardDetail: () => {},
});

export const CardDetailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);

  const openCardDetail = (card: Card) => {
    setSelectedCard(card);
    setIsCardDetailOpen(true);
  };

  const closeCardDetail = () => {
    setSelectedCard(null);
    setIsCardDetailOpen(false);
  };

  return (
    <CardDetailContext.Provider value={{ 
      selectedCard, 
      setSelectedCard,
      isCardDetailOpen,
      openCardDetail, 
      closeCardDetail 
    }}>
      {children}
    </CardDetailContext.Provider>
  );
};

export const useCardDetailContext = () => {
  const context = useContext(CardDetailContext);
  if (!context) {
    throw new Error('useCardDetail must be used within a CardDetailProvider');
  }
  return context;
};
