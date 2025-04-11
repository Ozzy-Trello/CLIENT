import React, { createContext, useState, useContext, ReactNode } from 'react';
import { AnyList, Card } from '@/app/dto/types';

type CardDetailContextType = {
  selectedCard: Card | null;
  activeList: AnyList | null;
  setSelectedCard: React.Dispatch<React.SetStateAction<Card | null>>;
  isCardDetailOpen: boolean;
  openCardDetail: (card: Card, list: AnyList) => void;
  closeCardDetail: () => void;
};

const CardDetailContext = createContext<CardDetailContextType>({
  selectedCard: null,
  activeList: null,
  setSelectedCard: () => {},
  isCardDetailOpen: false,
  openCardDetail: () => {},
  closeCardDetail: () => {},
});

export const CardDetailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeList, setActiveList] = useState<AnyList | null>(null); // Add this line
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);

  const openCardDetail = (card: Card, list: AnyList) => {
    card.listId = list.id;
    setSelectedCard(card);
    setActiveList(list);
    setIsCardDetailOpen(true);
  };

  const closeCardDetail = () => {
    setSelectedCard(null);
    setActiveList(null);
    setIsCardDetailOpen(false);
  };

  return (
    <CardDetailContext.Provider value={{ 
      selectedCard,
      activeList,
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
