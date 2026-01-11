import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCardLabel,
  cardArchive,
  cards,
  cardUnarchive,
  copyCard,
  getCardLabels,
  mirrorCard,
  moveCard,
  moveOldCards,
  removeLabelFromCard,
  updateCard,
} from "../api/card";
import { api } from "../api";
import { ApiResponse } from "../types/type";
import { Card, CopycardPost } from "../types/card";
import { useEffect, useState, useCallback, useRef } from "react";
import { queryKeys } from "@constants/query-keys";

export function useCards(listId: string, boardId: string) {
  const queryClient = useQueryClient();

  // Main query for cards
  const cardsQuery = useQuery({
    queryKey: queryKeys.cards.list(listId),
    queryFn: () => cards(listId, boardId),
    enabled: !!listId,
    refetchOnMount: false, // Prevent refetch on mount, rely on cache and optimistic updates
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Prevent refetch on reconnect during drag operations
    retry: 3,
    staleTime: 60000, // 60 seconds - longer to prevent any refetches during drag operations
  });

  // Add a new card mutation with optimistic updates
  const addCardMutation = useMutation({
    mutationFn: ({ card, listId }: { card: Partial<Card>; listId: string }) => {
      return api.post(`/card`, card, {
        headers: { "list-id": listId },
      });
    },

    onMutate: async ({ card, listId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(listId),
      });

      const previousCards = queryClient.getQueryData(
        queryKeys.cards.list(listId)
      );
      const tempId = `temp-card-${Date.now()}`;

      const tempCard: Card = {
        ...card,
        id: tempId,
        createdAt: new Date().toISOString(),
        listId,
      } as Card;

      // Update individual list of cards
      queryClient.setQueryData(
        queryKeys.cards.list(listId),
        (old: ApiResponse<Card[]> | undefined) => {
          if (!old) return { data: [tempCard] };
          return {
            ...old,
            data: [...(old.data ?? []), tempCard],
          };
        }
      );

      // Update board-level lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.lists.board(boardId) },
        (old: any) => {
          if (!old?.data || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((list: any) => {
              if (list.id !== listId) return list;
              return {
                ...list,
                cards: [...(list.cards || []), tempCard],
              };
            }),
          };
        }
      );

      return { previousCards, tempId, listId };
    },

    onSuccess: (response, _variables, context) => {
      const realCard = response.data;
      const { tempId, listId } = context;

      // Update individual list cache
      queryClient.setQueryData(
        queryKeys.cards.list(listId),
        (old: ApiResponse<Card[]> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data:
              old?.data?.map((card) =>
                card.id === tempId ? realCard : card
              ) || [],
          };
        }
      );

      // Update board-level cache
      queryClient.setQueriesData(
        { queryKey: queryKeys.lists.board(boardId) },
        (old: any) => {
          if (!old?.data || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((list: any) => {
              if (list.id !== listId) return list;
              return {
                ...list,
                cards:
                  list.cards?.map((card: any) =>
                    card.id === tempId ? realCard : card
                  ) || [],
              };
            }),
          };
        }
      );
    },

    onError: (err, _variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          queryKeys.cards.list(context.listId),
          context.previousCards
        );
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(variables.listId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists.board(boardId),
      });
    },
  });

  // Update card mutation (for changing content, moving between lists, etc.)
  const updateCardMutation = useMutation({
    mutationFn: ({
      cardId,
      updates,
      listId,
      destinationListId,
    }: {
      cardId: string;
      updates: Partial<Card>;
      listId?: string;
      destinationListId?: string;
    }) => {
      return api.put(`/card/${cardId}`, updates);
    },
    onMutate: async ({ cardId, updates, listId, destinationListId }) => {
      // If no listId or destinationListId provided, it's a simple card details update
      // We'll just invalidate all card queries after the mutation
      if (!listId && !destinationListId) {
        return { isSimpleUpdate: true };
      }

      // For regular updates within the same list
      if (!destinationListId || destinationListId === listId) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.cards.list(listId!),
        });
        const previousCards = queryClient.getQueryData(
          queryKeys.cards.list(listId!)
        );

        // Update the UI optimistically
        queryClient.setQueryData(
          queryKeys.cards.list(listId!),
          (old: ApiResponse<Card[]> | undefined) => {
            if (!old) return { data: [] };

            return {
              ...old,
              data: (old.data ?? []).map((card) =>
                card.id === cardId ? { ...card, ...updates } : card
              ),
            };
          }
        );

        return { previousCards, isMoveOperation: false, listId };
      } else {
        // For moving a card between lists
        // Cancel queries for both source and destination lists
        await Promise.all([
          queryClient.cancelQueries({
            queryKey: queryKeys.cards.list(listId!),
          }),
          queryClient.cancelQueries({
            queryKey: queryKeys.cards.list(destinationListId),
          }),
        ]);

        const sourceCards = queryClient.getQueryData(
          queryKeys.cards.list(listId!)
        );
        const destinationCards = queryClient.getQueryData(
          queryKeys.cards.list(destinationListId)
        );

        // Find the card to move
        const cardToMove = (sourceCards as ApiResponse<Card[]>)?.data?.find(
          (card) => card.id === cardId
        );

        if (!cardToMove) return { isMoveOperation: false };

        // Updated card with new list ID
        const updatedCard = { ...cardToMove, listId: destinationListId };

        // Remove from source list
        queryClient.setQueryData(
          queryKeys.cards.list(listId!),
          (old: ApiResponse<Card[]> | undefined) => {
            if (!old) return { data: [] };
            return {
              ...old,
              data: (old.data ?? []).filter((card) => card.id !== cardId),
            };
          }
        );

        // Add to destination list
        queryClient.setQueryData(
          queryKeys.cards.list(destinationListId),
          (old: ApiResponse<Card[]> | undefined) => {
            if (!old) return { data: [updatedCard] };
            return {
              ...old,
              data: [...(old.data ?? []), updatedCard],
            };
          }
        );

        return {
          sourceCards,
          destinationCards,
          isMoveOperation: true,
          sourceListId: listId,
          destListId: destinationListId,
        };
      }
    },
    onError: (err, variables, context) => {
      if (!context || context.isSimpleUpdate) return;

      if (!context.isMoveOperation) {
        if (context.previousCards && context.listId) {
          queryClient.setQueryData(
            queryKeys.cards.list(context.listId),
            context.previousCards
          );
        }
      } else {
        if (context.sourceCards && context.sourceListId) {
          queryClient.setQueryData(
            queryKeys.cards.list(context.sourceListId),
            context.sourceCards
          );
        }
        if (context.destinationCards && context.destListId) {
          queryClient.setQueryData(
            queryKeys.cards.list(context.destListId),
            context.destinationCards
          );
        }
      }
    },
    onSettled: (data, error, variables) => {
      if ((window as any).__DRAG_IN_PROGRESS__) {
        return;
      }

      // Always invalidate PO-related queries for any card updates
      queryClient.invalidateQueries({ queryKey: ["pos", variables.cardId] });
      queryClient.invalidateQueries({ queryKey: ["po-items", variables.cardId] });

      if (!variables.listId && !variables.destinationListId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(variables.cardId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
        return;
      }

      if (variables.listId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.listId),
        });
      }

      if (
        variables.destinationListId &&
        variables.destinationListId !== variables.listId
      ) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.destinationListId),
        });
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.lists.board(boardId),
      });
    },
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: ({ cardId, listId }: { cardId: string; listId: string }) => {
      return api.delete(`/card/${cardId}`, {
        headers: { "list-id": listId },
      });
    },
    onMutate: async ({ cardId, listId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(listId),
      });
      const previousCards = queryClient.getQueryData(
        queryKeys.cards.list(listId)
      );

      queryClient.setQueryData(
        queryKeys.cards.list(listId),
        (old: ApiResponse<Card[]> | undefined) => {
          if (!old) return { data: [] };
          return {
            ...old,
            data: (old.data ?? []).filter((card) => card.id !== cardId),
          };
        }
      );

      return { previousCards };
    },
    onError: (err, variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          queryKeys.cards.list(variables.listId),
          context.previousCards
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Don't invalidate queries during drag operations to prevent state conflicts
      if ((window as any).__DRAG_IN_PROGRESS__) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(variables.listId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists.board(boardId),
      });
    },
  });

  return {
    cards: cardsQuery.data?.data || [],
    isLoading: cardsQuery.isLoading,
    isError: cardsQuery.isError,
    error: cardsQuery.error,
    addCard: addCardMutation.mutate,
    addCardAsync: addCardMutation.mutateAsync,
    updateCard: updateCardMutation.mutate,
    deleteCard: deleteCardMutation.mutate,
    isAddingCard: addCardMutation.isPending,
    isUpdatingCard: updateCardMutation.isPending,
    isDeletingCard: deleteCardMutation.isPending,
  };
}

/**
 * Lightweight hook exposing only card mutations (no card list query).
 * Useful in views that just need to update a card without fetching the full list.
 */
export function useCardMutationsOnly() {
  const queryClient = useQueryClient();

  const updateCardMutation = useMutation({
    mutationFn: ({
      cardId,
      updates,
      listId,
      destinationListId,
    }: {
      cardId: string;
      updates: Partial<Card>;
      listId?: string;
      destinationListId?: string;
    }) => {
      return api.put(`/card/${cardId}`, updates);
    },
    onSuccess: (_res, vars) => {
      if (vars.listId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(vars.listId),
        });
      }
      if (vars.destinationListId && vars.destinationListId !== vars.listId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(vars.destinationListId),
        });
      }
    },
  });

  return {
    updateCard: updateCardMutation.mutate,
    isUpdatingCard: updateCardMutation.isPending,
  };
}

/**
 * Hook for paginated cards with load more functionality
 */
export function useCardsPaginated(
  listId: string,
  boardId: string,
  options?: {
    enabled?: boolean;
    compactMode?: boolean;
    allowFetchInCompact?: boolean;
    initialTotal?: number;
    initialHasMore?: boolean;
    workspaceId?: string;
    expectedTotalOverride?: number;
  }
) {
  const queryClient = useQueryClient();
  const initialTotalFromOptions =
    options?.initialTotal ??
    options?.expectedTotalOverride ??
    0;
  const [currentPage, setCurrentPage] = useState(1);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [hasMoreCards, setHasMoreCards] = useState(
    options?.initialHasMore ?? true
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [totalCards, setTotalCards] = useState<number>(
    options?.initialTotal ?? 0
  );
  const limit = 20;
  const initialTotalRef = useRef<number>(
    (options?.initialTotal && options.initialTotal > 0
      ? options.initialTotal
      : 0) || 0
  );

  // Helpers to determine pagination state even when the backend does not return totals
  const normalizeTotal = (total?: number | null) =>
    total && total > 0 ? total : undefined;
  const deriveHasMore = (
    explicitTotal: number | undefined,
    currentLength: number,
    pageSize: number,
    lastPageLength?: number
  ) => {
    if (explicitTotal !== undefined) {
      return currentLength < explicitTotal;
    }
    if (lastPageLength !== undefined) {
      return lastPageLength >= pageSize;
    }
    return currentLength >= pageSize;
  };
  const deriveTotal = (
    explicitTotal: number | undefined,
    currentLength: number,
    hasMore: boolean
  ) => {
    if (explicitTotal !== undefined) return explicitTotal;
    // If total is unknown but we think there are more, show a +1 to hint pagination
    return hasMore ? currentLength + 1 : currentLength;
  };

  const augmentDashcardCard = (card: Card): Card => card;
  const coerceTotal = useCallback(
    (value: number | undefined, lengthHint?: number) => {
      const numericValue =
        typeof value === "number" && !Number.isNaN(value) ? value : 0;
      const length = lengthHint ?? allCards.length;
      const floorTotal = normalizeTotal(initialTotalFromOptions) ?? 0;
      const remembered = initialTotalRef.current;
      return Math.max(numericValue, length, floorTotal, remembered);
    },
    [allCards.length, initialTotalFromOptions]
  );
  const rememberTotal = useCallback(
    (maybeTotal?: number | null) => {
      const normalized = normalizeTotal(maybeTotal);
      if (normalized !== undefined && normalized > initialTotalRef.current) {
        initialTotalRef.current = normalized;
      }
    },
    []
  );
  useEffect(() => {
    rememberTotal(initialTotalFromOptions);
    if (options?.expectedTotalOverride) {
      rememberTotal(options.expectedTotalOverride);
    }
  }, [initialTotalFromOptions, rememberTotal]);

  // Initial query for first page
  const cachedData = queryClient.getQueryData<ApiResponse<Card[]>>(
    queryKeys.cards.list(listId)
  );
  const hasCache = !!cachedData;

  const isEnabled =
    !!listId &&
    (options?.enabled ?? true) &&
    (!options?.compactMode ||
      options?.allowFetchInCompact === true ||
      !hasCache);

  const cardsQuery = useQuery({
    queryKey: queryKeys.cards.list(listId),
    queryFn: () => cards(listId, boardId, 1, limit),
    enabled: isEnabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  // Reset pagination when listId changes and initialize from cache if available
  useEffect(() => {
    // Check cache first
    if (!isEnabled) {
      // In compact mode we may rely purely on hydrated cache; do not wipe out cards if cached.
      if (cachedData?.data && Array.isArray(cachedData.data)) {
        const explicitTotal = normalizeTotal(
          cachedData.paginate?.totalData ||
            (cachedData as any).paginate?.total_data ||
            initialTotalFromOptions
        );
        rememberTotal(explicitTotal);
        setAllCards(cachedData.data);
        const hasMore =
          deriveHasMore(
            explicitTotal,
            cachedData.data.length,
            limit,
            cachedData.data.length
          ) || (options?.initialHasMore ?? false);
        setHasMoreCards(hasMore);
        setTotalCards(
          coerceTotal(
            deriveTotal(explicitTotal, cachedData.data.length, hasMore),
            cachedData.data.length
          )
        );
      } else {
        setAllCards([]);
        setHasMoreCards(options?.initialHasMore ?? true);
        setTotalCards(coerceTotal(initialTotalFromOptions || 0));
      }
      return;
    }

    const initialPage =
      cachedData?.paginate?.page ||
      (cachedData as any)?.paginate?.page ||
      1;
    setCurrentPage(initialPage);
    setIsLoadingMore(false);
    setLoadMoreError(null);
    setTotalCards(coerceTotal(0));

    if (cachedData?.data && Array.isArray(cachedData.data)) {
      // Initialize from cached data
      const explicitTotal = normalizeTotal(
        cachedData.paginate?.totalData ||
          (cachedData as any).paginate?.total_data ||
          initialTotalFromOptions
      );
      rememberTotal(explicitTotal);
      setAllCards(cachedData.data);
      const hasMore =
        deriveHasMore(
          explicitTotal,
          cachedData.data.length,
          limit,
          cachedData.data.length
        ) || (options?.initialHasMore ?? false);
      setHasMoreCards(hasMore);
      setTotalCards(
        coerceTotal(
          deriveTotal(explicitTotal, cachedData.data.length, hasMore),
          cachedData.data.length
        )
      );
    } else {
      // No cached data, reset to empty state
      setAllCards([]);
      setHasMoreCards(options?.initialHasMore ?? true);
    }
  }, [listId, queryClient, limit, isEnabled, coerceTotal, rememberTotal]);

  // Update allCards when initial query data changes (for fresh data)
  useEffect(() => {
    if (!isEnabled) return;
    if (!cardsQuery.data?.data || cardsQuery.isLoading) return;

    const incoming = cardsQuery.data.data.map(augmentDashcardCard);
    const explicitTotal = normalizeTotal(
      cardsQuery.data.paginate?.totalData ||
        (cardsQuery.data as any).paginate?.total_data ||
        initialTotalFromOptions
    );
    rememberTotal(explicitTotal);

    if (currentPage > 1) {
      // Replace the first page with the latest data, keep already loaded pages
      const incomingIds = new Set(incoming.map((c) => c.id));
      setAllCards((prev) => {
        const rest = prev
          // keep items beyond the first page or items not returned anymore (e.g., deleted)
          .filter((_, idx) => idx >= limit && !incomingIds.has(_.id));
        const merged = [...incoming, ...rest];
        const mergedHasMore = deriveHasMore(
          explicitTotal,
          merged.length,
          limit,
          incoming.length
        );
        setHasMoreCards(mergedHasMore);
        setTotalCards(deriveTotal(explicitTotal, merged.length, mergedHasMore));
        return merged;
      });
    } else {
      // Initial load or single-page state
      setAllCards(incoming);
      const firstPageHasMore =
        deriveHasMore(explicitTotal, incoming.length, limit, incoming.length) ||
        (options?.initialHasMore ?? false);
      setHasMoreCards(firstPageHasMore);
      setCurrentPage(1);
      setTotalCards(
        coerceTotal(
          deriveTotal(explicitTotal, incoming.length, firstPageHasMore),
          incoming.length
        )
      );
    }

    setLoadMoreError(null); // Clear any previous errors
  }, [
    cardsQuery.data?.data,
    cardsQuery.isLoading,
    limit,
    currentPage,
    isEnabled,
    options?.initialHasMore,
    initialTotalFromOptions,
    coerceTotal,
    rememberTotal,
  ]);

  // Load more cards function
  const loadMoreCards = useCallback(async () => {
    const expectedTotal = coerceTotal(
      totalCards || initialTotalFromOptions,
      allCards.length
    );
    const expectedWithOverride = Math.max(
      expectedTotal,
      options?.expectedTotalOverride ?? 0,
      initialTotalFromOptions
    );
    const shouldAttempt =
      hasMoreCards ||
      loadMoreError ||
      allCards.length < expectedWithOverride;
    const nextPageHint =
      cardsQuery.data?.paginate?.nextPage ||
      (cardsQuery.data as any)?.paginate?.next_page ||
      currentPage + 1;

    console.log("[LOAD MORE] click", {
      listId,
      boardId,
      currentPage,
      nextPageHint,
      expectedTotal,
      loaded: allCards.length,
      hasMoreCards,
      loadMoreError,
      isEnabled,
      isLoadingMore,
      shouldAttempt,
    });

    // if (!isEnabled || !shouldAttempt) {
    //   console.log("[LOAD MORE] skipping fetch", {
    //     reason: !isEnabled
    //       ? "disabled"
    //       : isLoadingMore
    //       ? "already loading"
    //       : "no more to load",
    //   });
    //   return;
    // }

    setIsLoadingMore(true);
    setLoadMoreError(null); // Clear previous errors

    try {
      const nextPage = Math.max(1, nextPageHint);
      const response = await cards(listId, boardId, nextPage, limit);

      const responseData = response.data;
      const explicitTotal = normalizeTotal(
        (response as any)?.paginate?.totalData ||
          (response as any)?.paginate?.total_data ||
          response.paginate?.totalData ||
          (response as any).paginate?.total_data ||
          initialTotalFromOptions
      );
      rememberTotal(explicitTotal);
      if (
        responseData &&
        Array.isArray(responseData) &&
        responseData.length > 0
      ) {
        const newAllCards = [
          ...allCards,
          ...responseData.map(augmentDashcardCard),
        ];
        setAllCards(newAllCards);
        setCurrentPage(nextPage);
        const mergedHasMore = deriveHasMore(
          explicitTotal,
          newAllCards.length,
          limit,
          responseData.length
        );
        const nextTotal = deriveTotal(
          explicitTotal,
          newAllCards.length,
          mergedHasMore
        );
        setHasMoreCards(mergedHasMore);
        setTotalCards(coerceTotal(nextTotal, newAllCards.length));

        console.log("[LOAD MORE] success", {
          fetched: responseData.length,
          nextPage,
          mergedHasMore,
          nextTotal,
          explicitTotal,
        });

        // Update the query cache with all cards for drag-and-drop compatibility
        queryClient.setQueryData<ApiResponse<Card[]>>(
          queryKeys.cards.list(listId),
          (old) => {
            const basePaginate =
              (old as ApiResponse<Card[]> | undefined)?.paginate || {
                limit,
                page: nextPage,
                totalData: nextTotal,
                totalPage: Math.max(1, Math.ceil(nextTotal / (limit || 1))),
                nextPage: mergedHasMore ? nextPage + 1 : nextPage,
                prevPage: nextPage > 1 ? nextPage - 1 : 0,
              };

            const effectiveLimit = basePaginate.limit ?? limit;
            const effectivePage = basePaginate.page ?? nextPage;
            const effectiveTotalPage =
              basePaginate.totalPage ??
              Math.max(1, Math.ceil(nextTotal / (effectiveLimit || 1)));
            const effectivePrevPage =
              effectivePage > 1 ? effectivePage - 1 : 0;
            const effectiveNextPage = mergedHasMore
              ? effectivePage + 1
              : Math.min(effectiveTotalPage, Math.max(effectivePage, 1));

            return {
              ...old,
              status_code: 200,
              message: "Success",
              data: newAllCards,
              paginate: {
                ...basePaginate,
                limit: effectiveLimit,
                page: effectivePage,
                totalData: nextTotal,
                totalPage: effectiveTotalPage,
                nextPage: effectiveNextPage,
                prevPage: effectivePrevPage,
              },
            };
          }
        );
      } else {
        setHasMoreCards(false);
        setTotalCards((prev) =>
          coerceTotal(
            deriveTotal(explicitTotal, allCards.length, false),
            allCards.length
          )
        );
        console.log("[LOAD MORE] no data returned", {
          nextPage,
          explicitTotal,
        });
      }
    } catch (error) {
      console.error("Error loading more cards:", error);
      setLoadMoreError("Failed to load more cards. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    listId,
    boardId,
    currentPage,
    limit,
    hasMoreCards,
    isLoadingMore,
    allCards,
    queryClient,
    isEnabled,
    coerceTotal,
    rememberTotal,
  ]);

  // Add card mutation with optimistic updates for paginated cards
  const addCardMutation = useMutation({
    mutationFn: ({ card, listId }: { card: Partial<Card>; listId: string }) => {
      return api.post(`/card`, card, {
        headers: { "list-id": listId },
      });
    },
    onMutate: async ({ card, listId }) => {
      const tempId = `temp-card-${Date.now()}`;
      const tempCard: Card = {
        ...card,
        id: tempId,
        createdAt: new Date().toISOString(),
        listId,
      } as Card;

      // Add to the end of allCards
      setAllCards((prev) => [...prev, tempCard]);

      return { tempId, listId };
    },
    onSuccess: (response, _variables, context) => {
      const realCard = response.data;
      const { tempId } = context;

      // Replace temp card with real card
      setAllCards((prev) =>
        prev.map((card) => (card.id === tempId ? realCard : card))
      );
    },
    onError: (err, _variables, context) => {
      if (context?.tempId) {
        // Remove temp card on error
        setAllCards((prev) =>
          prev.filter((card) => card.id !== context.tempId)
        );
      }
    },
  });

  // Retry function for failed load more attempts
  const retryLoadMore = useCallback(() => {
    if (loadMoreError) {
      setLoadMoreError(null);
      loadMoreCards();
    }
  }, [loadMoreError, loadMoreCards]);

  return {
    cards: allCards,
    isLoading: cardsQuery.isLoading,
    isError: cardsQuery.isError,
    error: cardsQuery.error,
    hasMoreCards,
    isLoadingMore,
    loadMoreCards,
    loadMoreError,
    retryLoadMore,
    addCard: addCardMutation.mutate,
    addCardAsync: addCardMutation.mutateAsync,
    isAddingCard: addCardMutation.isPending,
    totalCards,
  };
}

/**
 * Hook to manage card movement between lists or within a list
 */
export function useCardMove(
  boardId?: string,
  options?: {
    onSettled?: () => void;
  }
) {
  const queryClient = useQueryClient();

  const cardMoveMutation = useMutation({
    mutationFn: ({
      cardId,
      previousListId,
      targetListId,
      previousPosition,
      targetPosition,
    }: {
      cardId: string;
      previousListId: string;
      targetListId: string;
      previousPosition: number;
      targetPosition: number;
    }) => {
      return moveCard(
        cardId,
        previousListId,
        targetListId,
        previousPosition,
        targetPosition
      );
    },
    onMutate: async ({ cardId, previousListId, targetListId }) => {
      // Cancel any outgoing refetches to prevent conflicts
      await queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(previousListId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(targetListId),
      });

      // Just snapshot the previous values for potential rollback
      // The optimistic updates are now handled synchronously in the drag handler
      const previousSourceCards = queryClient.getQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(previousListId)
      );
      const previousTargetCards = queryClient.getQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(targetListId)
      );

      return { previousSourceCards, previousTargetCards };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousSourceCards) {
        queryClient.setQueryData(
          queryKeys.cards.list(variables.previousListId),
          context.previousSourceCards
        );
      }
      if (context?.previousTargetCards) {
        queryClient.setQueryData(
          queryKeys.cards.list(variables.targetListId),
          context.previousTargetCards
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Clean up drag state and re-enable cache operations
      document.body.classList.remove("dragging");
      (window as any).__DRAG_IN_PROGRESS__ = false;

      // Always invalidate queries after the mutation completes to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(variables.previousListId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(variables.targetListId),
      });

      // Small delay to catch any missed WebSocket updates during drag
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.previousListId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.targetListId),
        });
      }, 100);
    },
  });

  return {
    moveCard: cardMoveMutation.mutate,
    isMovingCard: cardMoveMutation.isPending,
    moveCardError: cardMoveMutation.error,
  };
}

export function useCardCopy() {
  const queryClient = useQueryClient();

  const cardCopyMutation = useMutation({
    mutationFn: ({
      boardId,
      cardId,
      cardCopyData,
    }: {
      boardId: string;
      cardId: string;
      cardCopyData: CopycardPost;
    }) => {
      return copyCard(cardId, cardCopyData);
    },
    onMutate: async ({ cardCopyData, boardId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(cardCopyData?.targetListId || ""),
      });
      const previousCards = queryClient.getQueryData(
        queryKeys.cards.list(cardCopyData?.targetListId || "")
      );

      // Create temporary card for optimistic update
      const tempCard = {
        name: cardCopyData?.name,
        id: `temp-card-${Date.now()}`,
        createdAt: new Date().toISOString(),
        listId: cardCopyData?.targetListId,
      };

      // Update the UI optimistically
      queryClient.setQueryData(
        queryKeys.cards.list(cardCopyData?.targetListId || ""),
        (old: ApiResponse<Card[]> | undefined) => {
          if (!old) return { data: [tempCard] };
          return {
            ...old,
            data: [...(old.data ?? []), tempCard],
          };
        }
      );

      // Also update the cards in the list cache if it exists
      // This ensures both the dedicated cards query and the list+cards query are in sync
      queryClient.setQueriesData(
        { queryKey: queryKeys.lists.board(boardId) },
        (old: any) => {
          if (!old) return old;

          // Only proceed if old is an object with data property that's an array
          if (!old.data || !Array.isArray(old.data)) return old;

          return {
            ...old,
            data: old.data.map((list: any) => {
              if (list.id === cardCopyData) {
                return {
                  ...list,
                  cards: [...(list.cards || []), tempCard],
                };
              }
              return list;
            }),
          };
        }
      );

      return { previousCards };
    },
    onError: (err, variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          queryKeys.cards.list(variables.cardCopyData.targetListId || ""),
          context.previousCards
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(
          variables.cardCopyData.targetListId || ""
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists.board(variables.boardId),
      });
    },
  });

  return {
    copyCard: cardCopyMutation.mutate,
    isCopyingngCard: cardCopyMutation.isPending,
    copyCardError: cardCopyMutation.error,
  };
}

export function useMirrorCard() {
  const queryClient = useQueryClient();

  const cardMirrorMutation = useMutation({
    mutationFn: ({
      boardId,
      id,
      targetListId,
      targetPosition,
    }: {
      boardId: string;
      id: string;
      targetListId: string;
      targetPosition: number;
    }) => mirrorCard(id, { id, targetListId, targetPositon: targetPosition }),

    onMutate: async ({ boardId, id, targetListId, targetPosition }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(targetListId),
      });

      const previousCards = queryClient.getQueryData(
        queryKeys.cards.list(targetListId)
      );

      const tempCard: Partial<Card> = {
        id: `temp-mirror-${Date.now()}`,
        name: "Mirrored card",
        listId: targetListId,
        createdAt: new Date().toISOString(),
      };

      // Optimistically update cards in the target list
      queryClient.setQueryData(
        queryKeys.cards.list(targetListId),
        (old: any) => {
          if (!old) return { data: [tempCard] };
          return {
            ...old,
            data: [...(old.data ?? []), tempCard],
          };
        }
      );

      // Optimistically update cards inside list -> board query
      queryClient.setQueriesData(
        { queryKey: queryKeys.lists.board(boardId) },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((list: any) => {
              if (list.id === targetListId) {
                return {
                  ...list,
                  cards: [...(list.cards || []), tempCard],
                };
              }
              return list;
            }),
          };
        }
      );

      return { previousCards };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.cards.list(variables.targetListId),
        context?.previousCards
      );
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.list(variables.targetListId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists.board(variables.boardId),
      });
    },
  });

  return {
    mirrorCard: cardMirrorMutation.mutate,
    mirrorCardAsync: cardMirrorMutation.mutateAsync,
    isMirroringCard: cardMirrorMutation.isPending,
    mirrorCardError: cardMirrorMutation.error,
  };
}

/**
 * Hook to get time a card has spent in a specific board
 */
export function useCardTimeInBoard(cardId: string, boardId: string) {
  const queryClient = useQueryClient();

  // Query for card time in board data
  const cardTimeInBoardQuery = useQuery({
    queryKey: ["card-time-in-board", cardId, boardId], // This seems to be a specific query, keeping as is
    queryFn: () =>
      api
        .get(`/v1/card/${cardId}/time-in-board/${boardId}`)
        .then((res) => res.data),
    enabled: !!cardId && !!boardId, // Only run the query if both IDs are available
    staleTime: 30000, // Data doesn't change very frequently
  });

  return {
    timeInBoard: cardTimeInBoardQuery.data?.data,
    isLoading: cardTimeInBoardQuery.isLoading,
    isError: cardTimeInBoardQuery.isError,
    error: cardTimeInBoardQuery.error,
    refetch: cardTimeInBoardQuery.refetch,
  };
}

export function useMoveOldCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: moveOldCards,
    onSuccess: () => {
      // Invalidate all card-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });
}
