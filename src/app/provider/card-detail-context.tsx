import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { AnyList, Card } from '@/app/dto/types';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

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
  const [isOpenViaUrl, setIsOpenViaUrl] = useState(false); //determine if the modal is open via URL or not
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeList, setActiveList] = useState<AnyList | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleUrlChange = useRef<boolean>(); // Track if URL change is handled

  
  const openCardDetail = (card: Card, list: AnyList) => {
    handleUrlChange.current = true; // Set to true when opening card detail
    card.listId = list.id;
    setSelectedCard(card);
    setActiveList(list);
    setIsCardDetailOpen(true);
    setIsOpenViaUrl(false);
  
    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set('listId', list.id);
    params.set('cardId', card.id);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };
  
  const closeCardDetail = () => {
    setSelectedCard(null);
    setActiveList(null);
    setIsCardDetailOpen(false);
    setIsOpenViaUrl(false);
    handleUrlChange.current = undefined;
    
    // Remove params without full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.delete('listId');
    params.delete('cardId');
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };
  
  // Handle URL changes
  useEffect(() => {
    if (handleUrlChange.current == undefined) {
      const cardId = searchParams.get('cardId');
      const listId = searchParams.get('listId');
      if (cardId && listId) {
        setIsCardDetailOpen(true);
        const card: Card = {id: cardId, listId: listId} as Card;
        const list: AnyList = {id: listId} as AnyList;

        setSelectedCard(card);
        setActiveList(list);
      } else {
        closeCardDetail();
      }
    }

  }, [searchParams]);
  
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
