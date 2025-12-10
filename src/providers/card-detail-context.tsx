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
import { useRecentlyViewed } from "@hooks/recently-viewed";
import { useSelector } from "react-redux";
import { selectCurrentBoard, selectCurrentWorkspace } from "@store/workspace_slice";

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
  updateVisibleColumns: (columns: string[]) => void;
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
  isLoadingCardDetails: boolean;
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
  updateVisibleColumns: () => {},
  refetchCardDetails: () => {},

  isUpdatingCard: false,
  isLoadingCardDetails: false,
});

export const CardDetailProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const TIMEOUT = 300;
  const { boardId, workspaceId } = useParams();
  const { addRecentlyViewedCard } = useRecentlyViewed();
  const currentBoard = useSelector(selectCurrentBoard);
  const currentWorkspace = useSelector(selectCurrentWorkspace);
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



  const openCardDetail = async (card: Card, list: AnyList) => {
    handleUrlChange.current = true; // Set to true when opening card detail

    // Don't set incomplete card data immediately - let React Query fetch complete data
    // Only set the basic state needed for the query to work, but keep the name for immediate display
    setActiveList(list);
    setIsCardDetailOpen(true);
    setIsOpenViaUrl(false);

    if (!selectedCard || selectedCard.id !== card.id) {
      setSelectedCard({ ...card, listId: list.id } as Card);
    }

    // Add to recently viewed cards
    addRecentlyViewedCard({
      id: card.id,
      name: card.name,
      boardId: boardId as string,
      boardName: currentBoard?.name || 'Untitled Board',
      listId: list.id,
      listName: list.name || 'Untitled List',
      workspaceId: workspaceId as string,
    });

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

  // Helper to avoid pointless state churn that can trigger render loops
  const lastCardSnapshotRef = useRef<string>("");

  const snapshotCard = useCallback((card: Card | null) => {
    if (!card) return "";
    const stable = {
      id: card.id,
      updatedAt: (card as any).updatedAt || (card as any).updated_at || null,
      listId: card.listId,
      name: card.name,
      description: card.description,
      labelsLen: Array.isArray((card as any).labels)
        ? (card as any).labels.length
        : 0,
      membersLen: Array.isArray((card as any).members)
        ? (card as any).members.length
        : 0,
      attachmentsLen: Array.isArray((card as any).attachments)
        ? (card as any).attachments.length
        : 0,
      customFieldsLen: Array.isArray((card as any).customFields)
        ? (card as any).customFields.length
        : Array.isArray((card as any).custom_fields)
        ? (card as any).custom_fields.length
        : 0,
      requestsLen: Array.isArray((card as any).requests)
        ? (card as any).requests.length
        : 0,
      timeInListsLen: Array.isArray((card as any).timeInLists)
        ? (card as any).timeInLists.length
        : 0,
    };
    return JSON.stringify(stable);
  }, []);

  const isSameCard = useCallback((prev: Card | null, next: Card | null) => {
    if (!prev || !next) return false;
    if (prev.id !== next.id) return false;

    const prevUpdated = (prev as any).updatedAt || (prev as any).updated_at;
    const nextUpdated = (next as any).updatedAt || (next as any).updated_at;
    if (prevUpdated && nextUpdated && prevUpdated !== nextUpdated) {
      return false;
    }

    // If labels/members/attachments lengths differ, treat as changed
    const prevLabels = Array.isArray((prev as any).labels) ? (prev as any).labels : [];
    const nextLabels = Array.isArray((next as any).labels) ? (next as any).labels : [];
    if (prevLabels.length !== nextLabels.length) return false;

    const prevMembers = Array.isArray((prev as any).members) ? (prev as any).members : [];
    const nextMembers = Array.isArray((next as any).members) ? (next as any).members : [];
    if (prevMembers.length !== nextMembers.length) return false;

    const prevAttachments = Array.isArray((prev as any).attachments) ? (prev as any).attachments : [];
    const nextAttachments = Array.isArray((next as any).attachments) ? (next as any).attachments : [];
    if (prevAttachments.length !== nextAttachments.length) return false;

    const keys: Array<keyof Card> = [
      "name",
      "description",
      "listId",
      "order",
      "archive",
      "isComplete",
      "completed_at",
      "bahan",
      "poAmount",
    ];
    return keys.every((k) => (prev as any)?.[k] === (next as any)?.[k]);
  }, []);

  // Update selectedCard when React Query data changes (including from WebSocket events)
  useEffect(() => {
    if (!isCardDetailOpen) return;
    if (cardDetailsQuery.card) {
      const incomingSnap = snapshotCard(cardDetailsQuery.card);
      if (lastCardSnapshotRef.current && lastCardSnapshotRef.current === incomingSnap) {
        return;
      }
      // Don't override local state if there's a pending mutation (optimistic update)
      if (isPending) {
        return;
      }
      
      // Always update with the complete card data from React Query
      setSelectedCard((prevCard) => {
        const fetchedCard = cardDetailsQuery.card!;
        const nextSnap = snapshotCard(fetchedCard);
        if (lastCardSnapshotRef.current && lastCardSnapshotRef.current === nextSnap) {
          return prevCard;
        }
        if (isSameCard(prevCard, fetchedCard)) {
          return prevCard;
        }
        const merged = {
          ...(prevCard || {}),
          ...fetchedCard,
          listId: fetchedCard.listId || activeList?.id,
        } as Card;
        lastCardSnapshotRef.current = snapshotCard(merged);
        return merged;
      });
    }
  }, [cardDetailsQuery.card, activeList?.id, isCardDetailOpen, isPending, isSameCard, snapshotCard]);

  const closeCardDetail = useCallback(() => {
    // Set flag to prevent URL effect from running during this programmatic change
    handleUrlChange.current = true;
    
    setSelectedCard(null);
    setActiveList(null);
    setIsCardDetailOpen(false);
    setIsOpenViaUrl(false);

    // Remove params without full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.delete("listId");
    params.delete("cardId");

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    
    router.replace(newUrl, { scroll: false });
    
    // Reset the flag after a short delay to allow URL change to complete
    setTimeout(() => {
      handleUrlChange.current = undefined;
    }, 100);
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

    mutate({
      dashConfig: {
        ...dashcardConfig,
        backgroundColor,
      },
    });
  };

  const handleVisibleColumnsUpdate = useDebouncedCallback(
    (visibleColumns: string[]) => {
      if (!selectedCard || !dashcardConfig) {
        console.warn(
          "Cannot update visible columns: missing selectedCard or dashcardConfig"
        );
        return;
      }

      mutate({
        dashConfig: {
          ...dashcardConfig,
          visibleColumns,
        },
      });
    },
    TIMEOUT
  );

  const updateVisibleColumns = (columns: string[]) => {
    setDashcardConfig((prev) =>
      prev
        ? {
            ...prev,
            visibleColumns: columns,
          }
        : prev
    );
    handleVisibleColumnsUpdate(columns);
  };

  // Handle URL changes
  useEffect(() => {
    const cardId = searchParams.get("cardId");
    const listId = searchParams.get("listId");

    // Only handle URL changes if we're not in the middle of a programmatic change
    if (handleUrlChange.current === undefined) {
      if (cardId && listId) {
        // Only open if not already open with the same card
        if (!isCardDetailOpen || selectedCard?.id !== cardId) {
          setIsCardDetailOpen(true);
          setIsOpenViaUrl(true);

          // Don't set incomplete card data - let React Query fetch complete data
          // Only set the basic state needed for the query to work
          const list: AnyList = { id: listId } as AnyList;
          setActiveList(list);
          
          // Set minimal card object just for the query key, but React Query will provide complete data
          setSelectedCard({ id: cardId, listId: listId } as Card);
        }
      } else if (isCardDetailOpen && !isOpenViaUrl) {
        // Only close if we're currently open and it wasn't opened via URL initially
        setSelectedCard(null);
        setActiveList(null);
        setIsCardDetailOpen(false);
      }
    }
  }, [searchParams.toString(), isCardDetailOpen, isOpenViaUrl]);

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
        updateVisibleColumns,
        refetchCardDetails: cardDetailsQuery.refetch,
        isUpdatingCard: isPending,
        isLoadingCardDetails: cardDetailsQuery.isFetching,
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
