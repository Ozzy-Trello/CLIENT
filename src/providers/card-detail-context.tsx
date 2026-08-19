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
import { queryKeys } from "@constants/query-keys";

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
  saveFilters: () => void;
  updateDisplayConfig: (displayConfig: any) => void;
  updateBackgroundColor: (backgroundColor: string) => void;
  updateVisibleColumns: (columns: string[]) => void;
  updateColumnOrder: (columns: string[]) => void;
  saveColumnsConfig: (visibleColumns: string[], columnOrder: string[]) => Promise<void>;
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
  setSelectedCard: () => { },
  isCardDetailOpen: false,
  openCardDetail: async () => { },
  closeCardDetail: () => { },
  handleItemDashcard: () => { },
  dashcardConfig: undefined,
  setDashcardConfig: () => { },
  itemDashcard: [],
  setItemDashcard: () => { },
  processedItemDashcard: [],
  setProcessedItemDashcard: () => { },

  openEditFilter: false,
  setOpenEditFilter: () => { },

  currentFilter: [],
  setCurrentFilter: () => { },
  handleChangeFilter: () => { },
  handleDeleteFilter: () => { },
  saveFilters: () => { },
  updateDisplayConfig: () => { },
  updateBackgroundColor: () => { },
  updateVisibleColumns: () => { },
  updateColumnOrder: () => { },
  saveColumnsConfig: async () => { },
  refetchCardDetails: () => { },

  isUpdatingCard: false,
  isLoadingCardDetails: false,
});

const sanitizeQueryId = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.toLowerCase();
  if (normalized === "undefined" || normalized === "null") {
    return null;
  }
  const baseValue = trimmed.split("?")[0]?.split("&")[0]?.trim();
  return baseValue || null;
};

const sanitizeQueryText = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
};

const resolveCardName = (card: any): string | undefined => {
  const rawName = card?.name ?? card?.card_name ?? card?.cardName;
  if (rawName === undefined || rawName === null) {
    return undefined;
  }
  const normalized = String(rawName).trim();
  return normalized || undefined;
};

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
    // Don't set incomplete card data immediately - let React Query fetch complete data
    // Only set the basic state needed for the query to work, but keep the name for immediate display
    setActiveList(list);
    setIsCardDetailOpen(true);
    setIsOpenViaUrl(false);

    if (!selectedCard || selectedCard.id !== card.id) {
      const cardName = resolveCardName(card);
      setSelectedCard({
        ...card,
        listId: list.id,
        ...(cardName ? { name: cardName } : {}),
      } as Card);
    }

    // Add to recently viewed cards
    addRecentlyViewedCard({
      id: card.id,
      name: resolveCardName(card) || card.name,
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

  const { mutate, mutateAsync, isPending } = useMutation({
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
      if (selectedCard?.id) {
        queryClient.invalidateQueries({
          queryKey: ["dashcardCount", workspaceId, selectedCard.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["list-dashcard", selectedCard.id, workspaceId],
        });
      }
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

    const customFieldValueSignature = (c: any) => {
      const fields = Array.isArray(c?.customFields)
        ? c.customFields
        : Array.isArray(c?.custom_fields)
          ? c.custom_fields
          : [];

      return (fields as any[])
        .map((f) => {
          const id = String(
            f?.id ?? f?.customFieldId ?? f?.custom_field_id ?? ""
          ).trim();
          if (!id) return "";

          const raw =
            f?.valueString ??
            f?.value_string ??
            f?.valueOption ??
            f?.value_option ??
            f?.valueNumber ??
            f?.value_number ??
            f?.valueCheckbox ??
            f?.value_checkbox ??
            f?.valueDate ??
            f?.value_date ??
            "";

          const v = raw === null || raw === undefined ? "" : String(raw).trim();
          return v ? `${id}:${v}` : "";
        })
        .filter(Boolean)
        .sort()
        .join("|");
    };

    const stable = {
      id: card.id,
      updatedAt: (card as any).updatedAt || (card as any).updated_at || null,
      listId: card.listId,
      name: card.name,
      description: card.description,
      isComplete: (card as any).isComplete ?? false,
      completedAt:
        (card as any).completedAt ??
        (card as any).completed_at ??
        null,
      archived:
        (card as any).archived ??
        (card as any).archive ??
        false,
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
      customFieldsValueSig: customFieldValueSignature(card),
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
    const signature = (atts: any[]) =>
      atts
        .map(
          (a) =>
            `${a.id}-${a.is_cover ?? a.isCover ?? a.isCover}-${a.is_printed ?? a.isPrinted ?? a.isPrinted}-${a.file?.url || ""
            }-${a.type || ""}`
        )
        .join("|");
    if (signature(prevAttachments) !== signature(nextAttachments)) return false;

    const prevCustomFields = Array.isArray((prev as any).customFields)
      ? (prev as any).customFields
      : Array.isArray((prev as any).custom_fields)
        ? (prev as any).custom_fields
        : [];
    const nextCustomFields = Array.isArray((next as any).customFields)
      ? (next as any).customFields
      : Array.isArray((next as any).custom_fields)
        ? (next as any).custom_fields
        : [];
    if (prevCustomFields.length !== nextCustomFields.length) return false;

    const customFieldValueSignature = (fields: any[]) =>
      (fields || [])
        .map((f: any) => {
          const id = String(
            f?.id ?? f?.customFieldId ?? f?.custom_field_id ?? ""
          ).trim();
          if (!id) return "";

          const raw =
            f?.valueString ??
            f?.value_string ??
            f?.valueOption ??
            f?.value_option ??
            f?.valueNumber ??
            f?.value_number ??
            f?.valueCheckbox ??
            f?.value_checkbox ??
            f?.valueDate ??
            f?.value_date ??
            "";
          const v = raw === null || raw === undefined ? "" : String(raw).trim();
          return v ? `${id}:${v}` : "";
        })
        .filter(Boolean)
        .sort()
        .join("|");

    if (
      customFieldValueSignature(prevCustomFields) !==
      customFieldValueSignature(nextCustomFields)
    ) {
      return false;
    }

    const keys = [
      "name",
      "description",
      "listId",
      "order",
      "archive",
      "archived",
      "isComplete",
      "completedAt",
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
      const fetchedCard = cardDetailsQuery.card;
      const incomingSnap = snapshotCard(fetchedCard);

      if (lastCardSnapshotRef.current && lastCardSnapshotRef.current === incomingSnap) {
        return;
      }
      // Don't override local state if there's a pending mutation (optimistic update)
      if (isPending) {
        return;
      }

      // Check if the card's listId has changed (e.g., from automation move)
      // If so, update the activeList to match
      const fetchedListId = fetchedCard.listId || (fetchedCard as any).list_id;
      if (fetchedListId && activeList?.id && fetchedListId !== activeList.id) {
        console.log("[LABEL LOG] 🔄 CardDetailContext: Card listId changed via WebSocket:", {
          from: activeList.id,
          to: fetchedListId,
          cardId: fetchedCard.id
        });
        // Update activeList to reflect the new list
        setActiveList({ id: fetchedListId } as AnyList);
      }

      // Always update with the complete card data from React Query
      setSelectedCard((prevCard) => {
        const nextSnap = snapshotCard(fetchedCard);
        if (lastCardSnapshotRef.current && lastCardSnapshotRef.current === nextSnap) {
          return prevCard;
        }
        if (isSameCard(prevCard, fetchedCard)) {
          return prevCard;
        }

        // IMPORTANT: Use fetchedCard.listId directly - don't fall back to activeList
        // This ensures the card shows the correct list after automation moves
        const newListId = fetchedCard.listId || (fetchedCard as any).list_id || activeList?.id;

        const previousName = resolveCardName(prevCard);
        const fetchedName = resolveCardName(fetchedCard);
        const mergedName = fetchedName || previousName;
        const merged = {
          ...(prevCard || {}),
          ...fetchedCard,
          listId: newListId,
          ...(mergedName ? { name: mergedName } : {}),
        } as Card;
        lastCardSnapshotRef.current = snapshotCard(merged);
        console.log("[LABEL LOG] 📝 CardDetailContext: Updated selectedCard with listId:", newListId);
        return merged;
      });
    }
  }, [cardDetailsQuery.card, activeList?.id, isCardDetailOpen, isPending, isSameCard, snapshotCard]);

  const closeCardDetail = useCallback(() => {
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

      return updatedFilters;
    });
  };

  const handleDeleteFilter = (type: string, id?: string) => {
    // If id is provided, delete the specific filter instance
    if (id) {
      setCurrentFilter((prev) => {
        const result = prev.filter((filter) => filter.id !== id);
        return [...result];
      });
      return;
    }

    // Legacy behavior: if no id provided, delete by type (for backward compatibility)
    const findFilter = currentFilter.find((filter) => filter.type === type);
    if (!findFilter) return;

    setCurrentFilter((prev) => {
      const result = prev.filter((filter) => filter.type !== type);
      return [...result];
    });
  };

  const saveFilters = useCallback(() => {
    if (!selectedCard || !dashcardConfig) return;

    setDashcardConfig((prev) =>
      prev
        ? {
          ...prev,
          filters: currentFilter,
        }
        : prev
    );

    mutate({
      dashConfig: {
        ...dashcardConfig,
        filters: currentFilter,
      },
    });

    setOpenEditFilter(false);
  }, [currentFilter, dashcardConfig, mutate, selectedCard]);

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

    setDashcardConfig((prev) =>
      prev
        ? {
            ...prev,
            displayConfig,
          }
        : prev
    );

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

    setDashcardConfig((prev) =>
      prev
        ? {
            ...prev,
            backgroundColor,
          }
        : prev
    );

    const listId = selectedCard.listId;
    const cardId = selectedCard.id;
    const normalizedBoardIdForCache = Array.isArray(boardId) ? boardId[0] : boardId;
    if (listId) {
      queryClient.setQueryData(
        queryKeys.cards.list(listId),
        (old: any) => {
          if (!old) return old;
          const items = Array.isArray(old.data) ? old.data : old.data?.data;
          if (!Array.isArray(items)) return old;
          const updatedItems = items.map((c: any) =>
            c?.id === cardId
              ? {
                  ...c,
                  dashConfig: { ...(c.dashConfig || {}), backgroundColor },
                }
              : c
          );
          if (Array.isArray(old.data)) {
            return { ...old, data: updatedItems };
          }
          return { ...old, data: { ...old.data, data: updatedItems } };
        }
      );
      queryClient.setQueryData(
        queryKeys.cards.detail(cardId),
        (old: any) => {
          if (!old) return old;
          const card = old.data;
          if (!card) return old;
          return {
            ...old,
            data: {
              ...card,
              dashConfig: { ...(card.dashConfig || {}), backgroundColor },
            },
          };
        }
      );
    }
    if (normalizedBoardIdForCache) {
      queryClient.setQueriesData(
        { queryKey: queryKeys.lists.board(normalizedBoardIdForCache) },
        (old: any) => {
          if (!old?.data || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((list: any) => {
              if (!Array.isArray(list?.cards)) return list;
              return {
                ...list,
                cards: list.cards.map((c: any) =>
                  c?.id === cardId
                    ? {
                        ...c,
                        dashConfig: {
                          ...(c.dashConfig || {}),
                          backgroundColor,
                        },
                      }
                    : c
                ),
              };
            }),
          };
        }
      );
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

  const handleColumnOrderUpdate = useDebouncedCallback(
    (columnOrder: string[]) => {
      if (!selectedCard || !dashcardConfig) {
        console.warn(
          "Cannot update column order: missing selectedCard or dashcardConfig"
        );
        return;
      }

      mutate({
        dashConfig: {
          ...dashcardConfig,
          columnOrder,
        },
      });
    },
    TIMEOUT
  );

  const updateColumnOrder = (columns: string[]) => {
    setDashcardConfig((prev) =>
      prev
        ? {
          ...prev,
          columnOrder: columns,
        }
        : prev
    );
    handleColumnOrderUpdate(columns);
  };

  const lastSavedColumnsRef = useRef<string>("");
  const isSavingColumnsRef = useRef<boolean>(false);

  const saveColumnsConfig = useCallback(
    async (visibleColumns: string[], columnOrder: string[]) => {
      if (!selectedCard || !dashcardConfig) {
        console.warn(
          "Cannot save columns: missing selectedCard or dashcardConfig",
          {
            selectedCard: !!selectedCard,
            dashcardConfig: !!dashcardConfig,
          }
        );
        return;
      }

      if (isSavingColumnsRef.current) {
        return;
      }

      const payloadKey = `${visibleColumns.join("|")}__${columnOrder.join("|")}`;
      if (lastSavedColumnsRef.current === payloadKey) {
        return;
      }

      const nextConfig = {
        ...dashcardConfig,
        visibleColumns,
        columnOrder,
      };

      try {
        isSavingColumnsRef.current = true;
        lastSavedColumnsRef.current = payloadKey;
        await mutateAsync({
          dashConfig: nextConfig,
        });
        setDashcardConfig(nextConfig);
      } catch (err) {
        lastSavedColumnsRef.current = "";
        throw err;
      } finally {
        isSavingColumnsRef.current = false;
        // if the caller tries to save the same payload again after completion, allow it
        // (the ref stays set, but isSavingColumnsRef gate prevents loops during the save)
      }
    },
    [dashcardConfig, mutateAsync, selectedCard]
  );

  // Track latest state via refs so the URL effect can read current values
  // without depending on them (which would re-fire the effect on every state change).
  const isCardDetailOpenRef = useRef(isCardDetailOpen);
  const isOpenViaUrlRef = useRef(isOpenViaUrl);
  const selectedCardIdRef = useRef<string | null>(selectedCard?.id ?? null);
  useEffect(() => { isCardDetailOpenRef.current = isCardDetailOpen; }, [isCardDetailOpen]);
  useEffect(() => { isOpenViaUrlRef.current = isOpenViaUrl; }, [isOpenViaUrl]);
  useEffect(() => { selectedCardIdRef.current = selectedCard?.id ?? null; }, [selectedCard?.id]);

  // Handle URL changes — fires ONLY on URL change, reads latest state via refs
  useEffect(() => {
    const isCardDetailOpen = isCardDetailOpenRef.current;
    const isOpenViaUrl = isOpenViaUrlRef.current;
    const selectedCardId = selectedCardIdRef.current;
    const rawCardId = searchParams.get("cardId");
    const rawListId = searchParams.get("listId");
    const rawCardName = searchParams.get("cardName");
    const cardId = sanitizeQueryId(rawCardId);
    const listId = sanitizeQueryId(rawListId);
    const cardNameFromQuery = sanitizeQueryText(rawCardName);
    const normalizedBoardId = Array.isArray(boardId) ? boardId[0] : boardId;

    if (cardId && listId) {
      const shouldNormalizeUrl = rawCardId !== cardId || rawListId !== listId;
      if (shouldNormalizeUrl) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("cardId", cardId);
        params.set("listId", listId);
        router.replace(`${window.location.pathname}?${params.toString()}`, {
          scroll: false,
        });
      }
    }

    if (cardId) {
      // Only open if not already open with the same card
      if (!isCardDetailOpen || selectedCardId !== cardId) {
        const cachedCardDetail = (queryClient.getQueryData(
          queryKeys.cards.detail(cardId)
        ) as any)?.data;
        const cachedCardsInList = listId
          ? (queryClient.getQueryData(queryKeys.cards.list(listId)) as any)?.data
          : undefined;
        const cachedCardFromList = Array.isArray(cachedCardsInList)
          ? cachedCardsInList.find((card: any) => card?.id === cardId)
          : null;
        const cachedCard = cachedCardDetail || cachedCardFromList;
        const cachedName = resolveCardName(cachedCard);
        const resolvedName = cachedName || cardNameFromQuery || undefined;
        const resolvedListId =
          listId ||
          cachedCard?.listId ||
          (cachedCard as any)?.list_id ||
          undefined;

        if (resolvedListId) {
          setIsCardDetailOpen(true);
          setIsOpenViaUrl(true);

          // Don't set incomplete card data - let React Query fetch complete data
          // Only set the basic state needed for the query to work
          const list: AnyList = { id: resolvedListId } as AnyList;
          setActiveList(list);

          // Set minimal card object just for the query key, but React Query will provide complete data
          setSelectedCard({
            ...(cachedCard || {}),
            id: cardId,
            listId: resolvedListId,
            ...(resolvedName ? { name: resolvedName } : {}),
          } as Card);

          // Extra hardening for deep-link opens: if cache has no name yet, fetch once immediately.
          if (!cachedCard?.name && normalizedBoardId) {
            void cardDetails(cardId, normalizedBoardId as string)
              .then((response) => {
                const fetchedCard = response?.data;
                if (!fetchedCard?.id) {
                  return;
                }

                const fetchedListId =
                  fetchedCard.listId ||
                  (fetchedCard as any).list_id ||
                  resolvedListId;
                if (!fetchedListId) {
                  return;
                }
                setActiveList({ id: fetchedListId } as AnyList);
                setSelectedCard((prev) => {
                  if (prev && prev.id !== cardId) {
                    return prev;
                  }
                  const previousName = resolveCardName(prev);
                  const fetchedName = resolveCardName(fetchedCard);
                  const mergedName = fetchedName || previousName;
                  return {
                    ...(prev || {}),
                    ...fetchedCard,
                    listId: fetchedListId,
                    ...(mergedName ? { name: mergedName } : {}),
                  } as Card;
                });
              })
              .catch(() => {
                // no-op: standard query flow will still attempt to fetch
              });
          }
        } else if (!resolvedListId && normalizedBoardId) {
          // Deep link has no listId anywhere (e.g. pasted/QR link without listId).
          // Resolve the card's list first, then open the card detail.
          cardDetails(cardId, normalizedBoardId)
            .then((response) => {
              const fetchedCard = response?.data;
              const fetchedListId =
                fetchedCard?.listId ||
                (fetchedCard as any)?.list_id ||
                "";
              if (!fetchedCard?.id || !fetchedListId) {
                return;
              }
              setActiveList({ id: fetchedListId } as AnyList);
              setSelectedCard((prev) => {
                if (prev && prev.id !== cardId) {
                  return prev;
                }
                const previousName = resolveCardName(prev);
                const fetchedName = resolveCardName(fetchedCard);
                const mergedName = fetchedName || previousName || cardNameFromQuery || undefined;
                return {
                  ...(prev || {}),
                  ...fetchedCard,
                  listId: fetchedListId,
                  ...(mergedName ? { name: mergedName } : {}),
                } as Card;
              });
              setIsCardDetailOpen(true);
              setIsOpenViaUrl(true);
            })
            .catch(() => {
              // no-op: standard query flow will still attempt to fetch
            });
        }
      }
    } else if (isCardDetailOpen && !isOpenViaUrl) {
      // Only close if we're currently open and it wasn't opened via URL initially
      setSelectedCard(null);
      setActiveList(null);
      setIsCardDetailOpen(false);
    }
  }, [searchParams.toString(), boardId, queryClient, router]);

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
        saveFilters,
        updateDisplayConfig,
        updateBackgroundColor,
        updateVisibleColumns,
        updateColumnOrder,
        saveColumnsConfig,
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
