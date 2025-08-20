import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cardDetails, updateCard } from "../api/card";
import { Card, IItemDashcard } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import {
  DashcardConfig,
  DashcardFilter,
  FilterOperator,
  FilterValue,
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
    value?: FilterValue;
  }) => void;
  handleDeleteFilter: (type: string, id?: string) => void;
  updateDisplayConfig: (displayConfig: any) => void;
  updateBackgroundColor: (backgroundColor: string) => void;
  refetchCardDetails: () => void;

  dashcardConfig: DashcardConfig | undefined;
  setDashcardConfig: React.Dispatch<
    React.SetStateAction<DashcardConfig | undefined>
  >;

  itemDashcard: IItemDashcard[];
  setItemDashcard: React.Dispatch<React.SetStateAction<IItemDashcard[]>>;
  processedItemDashcard: IItemDashcard[];
  setProcessedItemDashcard: React.Dispatch<
    React.SetStateAction<IItemDashcard[]>
  >;

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
  processedItemDashcard: [],
  setProcessedItemDashcard: () => {},

  openEditFilter: false,
  setOpenEditFilter: () => {},

  currentFilter: [],
  setCurrentFilter: () => {},

  handleChangeFilter: () => {},
  handleDeleteFilter: () => {},
  updateDisplayConfig: () => {},
  updateBackgroundColor: () => {},
  refetchCardDetails: () => {},

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
  const [processedItemDashcard, setProcessedItemDashcard] = useState<
    IItemDashcard[]
  >([]);
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
          // Use the updated listId from the fetched card data
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
    mutationFn: (data: Partial<Card>) => {
      // For dashcard configuration updates, we don't need to send listId
      // Only include listId if we're actually moving the card to a different list
      const isDashcardConfigUpdate =
        data.dashConfig && Object.keys(data).length === 1;

      let updateData: Partial<Card>;
      if (isDashcardConfigUpdate) {
        // Only send dashConfig, no listId
        updateData = { dashConfig: data.dashConfig };
      } else {
        // For other updates, include listId for the backend header requirement
        updateData = {
          ...data,
          listId: selectedCard?.listId || activeList?.id,
        };
      }

      return updateCard(selectedCard!.id, updateData);
    },
    onSuccess: async () => {
      queryClient.refetchQueries({
        queryKey: ["list-dashcard", selectedCard?.id, workspaceId],
      });
      queryClient.refetchQueries({
        queryKey: ["dashcardCount", selectedCard?.id],
      });
    },
    onError: (error) => {
      console.error("Error updating dashcard:", error);
      // You can add a toast notification here if needed
    },
  });

  const closeCardDetail = useCallback(() => {
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
  }, [router, searchParams]);

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
    value?: FilterValue;
  }) => {
    setCurrentFilter((prev) => {
      const updatedFilters = prev.map((filter) => {
        if (filter.id === id) {
          return {
            ...filter,
            ...(operator !== undefined && {
              operator: operator as FilterOperator,
            }),
            ...(value !== undefined && { value }),
          };
        }
        return filter;
      });

      handleFilter(updatedFilters);
      return updatedFilters;
    });
  };

  const handleDeleteFilter = (type: string, id?: string) => {
    // If id is provided, delete the specific filter instance
    if (id) {
      setCurrentFilter((prev) => {
        const result = prev.filter((filter) => filter.id !== id);
        handleFilter(result);
        return [...result];
      });
      return;
    }

    // Legacy behavior: if no id provided, delete by type (for backward compatibility)
    const findFilter = currentFilter.find((filter) => filter.type === type);
    if (!findFilter) return;

    setCurrentFilter((prev) => {
      const result = prev.filter((filter) => filter.type !== type);
      handleFilter(result);
      return [...result];
    });
  };

  const updateDisplayConfig = (displayConfig: any) => {
    if (!selectedCard || !dashcardConfig) {
      console.error(
        "Cannot update display config: missing selectedCard or dashcardConfig",
        {
          selectedCard: !!selectedCard,
          dashcardConfig: !!dashcardConfig,
        }
      );
      return;
    }

    console.log("Updating display config:", {
      displayConfig,
      currentDashcardConfig: dashcardConfig,
      selectedCard: selectedCard.id,
    });

    mutate({
      dashConfig: {
        ...dashcardConfig,
        displayConfig,
      },
    });
  };

  const updateBackgroundColor = (backgroundColor: string) => {
    if (!selectedCard || !dashcardConfig) {
      console.error(
        "Cannot update background color: missing selectedCard or dashcardConfig",
        {
          selectedCard: !!selectedCard,
          dashcardConfig: !!dashcardConfig,
        }
      );
      return;
    }

    console.log("Updating background color:", {
      backgroundColor,
      currentDashcardConfig: dashcardConfig,
      selectedCard: selectedCard.id,
    });

    mutate({
      dashConfig: {
        ...dashcardConfig,
        backgroundColor,
      },
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
  }, [searchParams, closeCardDetail]);

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
        processedItemDashcard,
        setProcessedItemDashcard,
        openEditFilter,
        setOpenEditFilter,
        currentFilter,
        setCurrentFilter,
        handleChangeFilter,
        handleDeleteFilter,
        updateDisplayConfig,
        updateBackgroundColor,
        refetchCardDetails: cardDetailsQuery.refetch,
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
