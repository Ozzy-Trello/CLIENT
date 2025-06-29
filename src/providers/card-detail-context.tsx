import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cardDetails, updateCard } from "../api/card";
import { Card, IItemDashcard } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import {
  DashcardConfig,
  DashcardFilter,
  FilterOperator,
} from "@myTypes/dashcard";
import { useDebouncedCallback } from "@hooks/useDebouncedCallback";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDashcardList } from "@hooks/dashcard-list";
import { useCardDetails } from "@hooks/card-details";

type CardDetailContextType = {
  selectedCard: Card | null;
  activeList: AnyList | null;
  setSelectedCard: React.Dispatch<React.SetStateAction<Card | null>>;
  isCardDetailOpen: boolean;
  openCardDetail: (card: Card, list: AnyList) => Promise<void>;
  closeCardDetail: () => void;
  handleItemDashcard: (cardId: string, listId: string, boardId: string) => void;
  handleChangeFilter: ({
    id,
    operator,
    value,
  }: {
    id: string;
    operator?: string;
    value?: string | boolean;
  }) => void;
  handleDeleteFilter: (type: string, id?: string) => void;

  dashcardConfig: DashcardConfig | undefined;
  setDashcardConfig: React.Dispatch<
    React.SetStateAction<DashcardConfig | undefined>
  >;

  itemDashcard: IItemDashcard[];
  setItemDashcard: React.Dispatch<React.SetStateAction<IItemDashcard[]>>;

  openEditFilter: boolean;
  setOpenEditFilter: React.Dispatch<React.SetStateAction<boolean>>;

  currentFilter: DashcardFilter[];
  setCurrentFilter: React.Dispatch<React.SetStateAction<DashcardFilter[]>>;

  isUpdatingCard: boolean;
};

const CardDetailContext = createContext<CardDetailContextType>({
  selectedCard: null,
  activeList: null,
  setSelectedCard: () => {},
  isCardDetailOpen: false,
  openCardDetail: async () => {},
  closeCardDetail: () => {},
  handleItemDashcard: () => {},
  dashcardConfig: undefined,
  setDashcardConfig: () => {},
  itemDashcard: [],
  setItemDashcard: () => {},

  openEditFilter: false,
  setOpenEditFilter: () => {},

  currentFilter: [],
  setCurrentFilter: () => {},

  handleChangeFilter: () => {},
  handleDeleteFilter: () => {},

  isUpdatingCard: false,
});

export const CardDetailProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const TIMEOUT = 300;
  const { boardId, workspaceId } = useParams();
  const [isOpenViaUrl, setIsOpenViaUrl] = useState(false); //determine if the modal is open via URL or not
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeList, setActiveList] = useState<AnyList | null>(null);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleUrlChange = useRef<boolean>(); // Track if URL change is handled

  // Use React Query for card details when card is selected
  const cardDetailsQuery = useCardDetails(
    selectedCard?.id || "",
    selectedCard?.listId || "",
    boardId as string
  );

  const [dashcardConfig, setDashcardConfig] = useState<
    DashcardConfig | undefined
  >();

  const [itemDashcard, setItemDashcard] = useState<IItemDashcard[]>([]);
  const [openEditFilter, setOpenEditFilter] = useState<boolean>(false);
  const [currentFilter, setCurrentFilter] = useState<DashcardFilter[]>([]);

  // Update selectedCard when React Query data changes (including from WebSocket events)
  useEffect(() => {
    if (
      cardDetailsQuery.card &&
      selectedCard?.id === cardDetailsQuery.card.id
    ) {
      setSelectedCard((prevCard) => {
        if (!prevCard) return prevCard;
        return {
          ...prevCard,
          ...cardDetailsQuery.card,
          listId: prevCard.listId, // Preserve listId from context
        };
      });
    }
  }, [cardDetailsQuery.card, selectedCard?.id]);

  const openCardDetail = async (card: Card, list: AnyList) => {
    handleUrlChange.current = true; // Set to true when opening card detail

    // Set the basic card data - React Query will handle fetching the full details
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

    // React Query will automatically fetch the full card details
    // and the useEffect above will update the selectedCard state
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Partial<Card>) => updateCard(selectedCard!.id, data),
    onSuccess: async () => {
      queryClient.refetchQueries({
        queryKey: ["list-dashcard", selectedCard?.id, workspaceId],
      });
      queryClient.refetchQueries({
        queryKey: ["dashcardCount", selectedCard?.id],
      });
    },
    onError: () => {},
  });

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

  const handleItemDashcard = (
    cardId: string,
    listId: string,
    boardId: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("listId", listId);
    params.set("cardId", cardId);
    router.replace(
      `/workspace/${workspaceId}/board/${boardId}?${params.toString()}`,
      {
        scroll: false,
      }
    );
  };

  const handleFilter = useDebouncedCallback((filters: DashcardFilter[]) => {
    if (!selectedCard || !dashcardConfig) return;

    mutate({
      dashConfig: {
        ...dashcardConfig,
        filters,
      },
    });
  }, TIMEOUT);

  const handleChangeFilter = ({
    id,
    operator,
    value,
  }: {
    id: string;
    operator?: string;
    value?: string | boolean;
  }) => {
    const findFilter = currentFilter.find((filter) => filter.id === id);

    if (!findFilter) return;

    if (operator || operator === "")
      findFilter.operator = operator as FilterOperator;
    if (value || value === "") findFilter.value = value;

    setCurrentFilter((prev) => {
      handleFilter(prev);
      return [...prev];
    });
  };

  const handleDeleteFilter = (type: string, id?: string) => {
    const findFilter = currentFilter.find((filter) => filter.type === type);

    if (!findFilter) return;

    if (findFilter.type === "custom_field" && id) {
      setCurrentFilter((prev) => {
        const result = prev.filter((filter) => filter.id !== id);
        handleFilter(result);
        return [...result];
      });

      return;
    }

    setCurrentFilter((prev) => {
      const result = prev.filter((filter) => filter.type !== type);
      handleFilter(result);
      return [...result];
    });
  };

  // Handle URL changes
  useEffect(() => {
    if (handleUrlChange.current == undefined) {
      const cardId = searchParams.get("cardId");
      const listId = searchParams.get("listId");
      if (cardId && listId) {
        setIsCardDetailOpen(true);
        setIsOpenViaUrl(true);

        // Set basic card data - React Query will fetch the full details
        const card: Card = { id: cardId, listId: listId } as Card;
        const list: AnyList = { id: listId } as AnyList;

        setSelectedCard(card);
        setActiveList(list);
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
        handleItemDashcard,
        dashcardConfig,
        setDashcardConfig,
        itemDashcard,
        setItemDashcard,
        openEditFilter,
        setOpenEditFilter,
        currentFilter,
        setCurrentFilter,
        handleChangeFilter,
        handleDeleteFilter,
        isUpdatingCard: isPending,
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
