import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cardDetails } from "../api/card";
import { Card } from "@myTypes/card";
import { AnyList } from "@myTypes/list";

type CardDetailContextType = {
  selectedCard: Card | null;
  activeList: AnyList | null;
  setSelectedCard: React.Dispatch<React.SetStateAction<Card | null>>;
  isCardDetailOpen: boolean;
  openCardDetail: (card: Card, list: AnyList) => Promise<void>;
  closeCardDetail: () => void;
};

const CardDetailContext = createContext<CardDetailContextType>({
  selectedCard: null,
  activeList: null,
  setSelectedCard: () => {},
  isCardDetailOpen: false,
  openCardDetail: async () => {},
  closeCardDetail: () => {},
});

export const CardDetailProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const {boardId} = useParams();
  const [isOpenViaUrl, setIsOpenViaUrl] = useState(false); //determine if the modal is open via URL or not
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeList, setActiveList] = useState<AnyList | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleUrlChange = useRef<boolean>(); // Track if URL change is handled

  const openCardDetail = async (card: Card, list: AnyList) => {
    handleUrlChange.current = true; // Set to true when opening card detail

    // First set the basic card data to show something immediately
    card.listId = list.id;
    setSelectedCard(card);
    setActiveList(list);
    setIsCardDetailOpen(true);
    setIsOpenViaUrl(false);

    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set("listId", list.id);
    params.set("cardId", card.id);
    router.replace(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    });

    // Then fetch the full card data including requests
    try {
      const resp = await cardDetails(card.id, boardId as string);
      if (resp.data) {
        const fullCard = resp.data;
        fullCard.listId = list.id;
        setSelectedCard(prevCard => {
          if (!prevCard) return prevCard;
          return {
            ...prevCard,
            ...fullCard
          };
        });
      }
    } catch (error) {
      console.error("Error fetching full card details:", error);
    }
  };

  const closeCardDetail = () => {
    setSelectedCard(null);
    setActiveList(null);
    setIsCardDetailOpen(false);
    setIsOpenViaUrl(false);
    handleUrlChange.current = undefined;

    // Remove params without full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.delete("listId");
    params.delete("cardId");
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  // Handle URL changes
  useEffect(() => {
    if (handleUrlChange.current == undefined) {
      const cardId = searchParams.get("cardId");
      const listId = searchParams.get("listId");
      if (cardId && listId) {
        setIsCardDetailOpen(true);
        const resp = cardDetails(cardId, boardId as string);
        resp.then((res) => {
          if (res.data) {
            const card: Card = res.data;
            card.listId = listId;
            const list: AnyList = { id: listId } as AnyList;

            setSelectedCard(card);
            setActiveList(list);
          }
        });
      } else {
        closeCardDetail();
      }
    }
  }, [searchParams]);

  return (
    <CardDetailContext.Provider
      value={{
        selectedCard,
        activeList,
        setSelectedCard,
        isCardDetailOpen,
        openCardDetail,
        closeCardDetail,
      }}
    >
      {children}
    </CardDetailContext.Provider>
  );
};

export const useCardDetailContext = () => {
  const context = useContext(CardDetailContext);
  if (!context) {
    throw new Error("useCardDetail must be used within a CardDetailProvider");
  }
  return context;
};
