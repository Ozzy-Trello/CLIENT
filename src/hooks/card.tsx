import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { registerMutation } from "./websocket";
import {
  addCardLabel,
  cardArchive,
  cards,
  CardListSortBy,
  CardSortOrder,
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
import { useEffect, useState, useCallback } from "react";
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
            data: [tempCard, ...(old.data ?? [])],
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
                cards: [tempCard, ...(list.cards || [])],
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.planner.all,
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

      const wasPoAmountUpdated =
        !!variables?.updates && "poAmount" in variables.updates;

      if (wasPoAmountUpdated && variables?.cardId) {
        const cardId = variables.cardId;
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["pos", cardId] });
          queryClient.invalidateQueries({ queryKey: ["po-items", cardId] });
          queryClient.invalidateQueries({
            queryKey: ["pos-size-assignment", cardId],
          });
        }, 500);
      }

      if (!variables.listId && !variables.destinationListId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(variables.cardId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
        return;
      }

      if (variables.listId && !variables.destinationListId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.listId),
        });
      }

      if (
        variables.destinationListId &&
        variables.destinationListId !== variables.listId &&
        !variables.listId
      ) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.destinationListId),
        });
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.lists.board(boardId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.planner.all,
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.planner.all,
      });
    },
  });

  return {
    cards: cardsQuery.data?.data || [],
    isLoading: cardsQuery.isLoading,
    isError: cardsQuery.isError,
    error: cardsQuery.error,
    addCard: addCardMutation.mutate,
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
    onMutate: async ({ cardId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.cards.detail(cardId),
      });

      const previousDetail = queryClient.getQueryData<ApiResponse<Card>>(
        queryKeys.cards.detail(cardId)
      );

      const previousLists = queryClient.getQueriesData<ApiResponse<Card[]>>({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "cards" &&
          query.queryKey[1] === "list",
      });

      queryClient.setQueryData(
        queryKeys.cards.detail(cardId),
        (old: ApiResponse<Card> | undefined) => {
          if (!old) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...updates,
            },
          };
        }
      );

      queryClient.setQueriesData(
        {
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "cards" &&
            query.queryKey[1] === "list",
        },
        (old: ApiResponse<Card[]> | undefined) => {
          if (!old?.data) return old;

          let hasUpdatedCard = false;
          const nextCards = old.data.map((card) => {
            if (card.id !== cardId) return card;
            hasUpdatedCard = true;
            return {
              ...card,
              ...updates,
            };
          });

          if (!hasUpdatedCard) return old;

          return {
            ...old,
            data: nextCards,
          };
        }
      );

      return { previousDetail, previousLists };
    },
    onError: (_err, vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          queryKeys.cards.detail(vars.cardId),
          context.previousDetail
        );
      }

      if (context?.previousLists) {
        context.previousLists.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
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

      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.detail(vars.cardId),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.all,
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.planner.all });
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
    labelIds?: string[];
    sortBy?: CardListSortBy;
    sortOrder?: CardSortOrder;
  }
) {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [hasMoreCards, setHasMoreCards] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [totalCards, setTotalCards] = useState<number>(0);
  const limit = 10;

  // Initial query for first page
  const isEnabled = !!listId && (options?.enabled ?? true);
  const labelIds = options?.labelIds;
  const normalizedLabelKey =
    labelIds && labelIds.length > 0
      ? [...labelIds].sort().join(",")
      : undefined;
  const sortSegment =
    options?.sortBy && options?.sortOrder
      ? `sort:${options.sortBy}:${options.sortOrder}`
      : "sort:manual";
  const baseKey = queryKeys.cards.list(listId);
  const queryKey = normalizedLabelKey
    ? [...baseKey, "filtered", normalizedLabelKey, sortSegment]
    : [...baseKey, sortSegment];

  const cardsQuery = useQuery({
    queryKey,
    queryFn: () =>
      cards(
        listId,
        boardId,
        1,
        limit,
        labelIds,
        options?.sortBy,
        options?.sortOrder
      ),
    enabled: isEnabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3,
    staleTime: 60000,
  });

  // Reset pagination when listId or labelIds changes and initialize from cache if available
  useEffect(() => {
    if (!isEnabled) {
      setAllCards([]);
      setHasMoreCards(true);
      setTotalCards(0);
      return;
    }

    setCurrentPage(1);
    setIsLoadingMore(false);
    setLoadMoreError(null);
    setTotalCards(0);

    // Check if we have cached data for this listId + labelIds combination
    const cachedData = queryClient.getQueryData<ApiResponse<Card[]>>(queryKey);

    if (cachedData?.data && Array.isArray(cachedData.data)) {
      // Initialize from cached data
      setAllCards(cachedData.data);
      setHasMoreCards(cachedData.data.length === limit);

      // Extract total count from cached pagination data
      const totalCount = cachedData.paginate?.totalData || cachedData.data.length;
      setTotalCards(totalCount);
    } else {
      // No cached data, reset to empty state
      setAllCards([]);
      setHasMoreCards(true);
    }
  }, [
    listId,
    labelIds?.join(","),
    queryClient,
    limit,
    isEnabled,
    options?.sortBy,
    options?.sortOrder,
  ]);

  // Update allCards when initial query data changes (for fresh data)
  useEffect(() => {
    if (!isEnabled) return;

    if (cardsQuery.data?.data && !cardsQuery.isLoading) {
      const incoming = cardsQuery.data.data;

      if (currentPage > 1) {
        // Replace the first page with the latest data, keep already loaded pages
        const incomingIds = new Set(incoming.map((c) => c.id));
        const rest = allCards
          // keep items beyond the first page or items not returned anymore (e.g., deleted)
          .filter((_, idx) => idx >= limit && !incomingIds.has(_.id));
        const merged = [...incoming, ...rest];
        setAllCards(merged);
        // Keep hasMoreCards as-is; deletion shouldn't reset pagination
      } else {
        // Initial load or single-page state
        setAllCards(incoming);
        setHasMoreCards(incoming.length === limit);
        setCurrentPage(1);
      }

      const totalCount =
        cardsQuery.data.paginate?.totalData || incoming.length || totalCards;
      setTotalCards(totalCount);
      setLoadMoreError(null); // Clear any previous errors
    }
  }, [
    cardsQuery.data?.data,
    cardsQuery.isLoading,
    limit,
    allCards,
    currentPage,
    totalCards,
    isEnabled,
  ]);

  // Load more cards function
  const loadMoreCards = useCallback(async () => {
    if (!isEnabled || !hasMoreCards || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadMoreError(null); // Clear previous errors

    try {
      const nextPage = currentPage + 1;
      const response = await cards(
        listId,
        boardId,
        nextPage,
        limit,
        labelIds,
        options?.sortBy,
        options?.sortOrder
      );

      const responseData = response.data;
      if (
        responseData &&
        Array.isArray(responseData) &&
        responseData.length > 0
      ) {
        const newAllCards = [...allCards, ...responseData];
        setAllCards(newAllCards);
        setCurrentPage(nextPage);
        setHasMoreCards(responseData.length === limit);

        // Update the query cache with all cards for drag-and-drop compatibility
        queryClient.setQueryData<ApiResponse<Card[]>>(
          queryKey,
          (old) => ({
            ...old,
            status_code: 200,
            message: "Success",
            data: newAllCards,
          })
        );
      } else {
        setHasMoreCards(false);
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
    labelIds,
    options?.sortBy,
    options?.sortOrder,
    queryKey,
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

      // Add to the beginning of allCards (prepend for "Add to Top")
      setAllCards((prev) => [tempCard, ...prev]);

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
    onSettled: (_data, _error, variables) => {
      // Ensure list data stays in sync after create
      if (variables?.listId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.listId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.lists.board(boardId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.planner.all,
      });
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
    isAddingCard: addCardMutation.isPending,
    totalCards,
  };
}

/**
 * Hook to manage card movement between lists or within a list
 */
export function useCardMove(boardId?: string) {
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
      // Register this mutation to prevent WebSocket from processing our own move
      registerMutation("card:moved", cardId);

      return moveCard(
        cardId,
        previousListId,
        targetListId,
        previousPosition,
        targetPosition
      );
    },
    onMutate: ({ previousListId, targetListId }) => {
      console.log('🔄 [CARD MOVE] onMutate - state updated by parent');

      queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(previousListId),
      });
      queryClient.cancelQueries({
        queryKey: queryKeys.cards.list(targetListId),
      });

      return {};
    },
    onError: () => {
      // Rollback is handled in the onDragEnd callback where we have the rollback data
      console.error('❌ [CARD MOVE] Mutation failed - rollback handled by onDragEnd');
    },
    onSuccess: () => {
      console.log('✅ [CARD MOVE] Success - local state stays');
    },
    onSettled: (_data, _error, variables) => {
      // NOTE: Flag cleanup is handled in the page.tsx drag handler
      // Invalidate list/card caches to pick up automation-driven changes.
      if (variables?.previousListId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.previousListId),
          refetchType: "all",
        });
      }
      if (
        variables?.targetListId &&
        variables.targetListId !== variables.previousListId
      ) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(variables.targetListId),
          refetchType: "all",
        });
      }
      if (variables?.cardId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(variables.cardId),
          refetchType: "all",
        });
        // IMPORTANT: Invalidate card labels to pick up automation-applied label changes
        // Using partial match because useLabels uses ["cardLabels", workspaceId, cardId]
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key[0] === "cardLabels" &&
              key[2] === variables.cardId
            );
          },
          refetchType: "all",
        });
        // IMPORTANT: Invalidate card custom fields to pick up automation-applied CF changes
        // Using partial match because useCardCustomField uses ["cardCustomField", cardId, workspaceId]
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key[0] === "cardCustomField" &&
              key[1] === variables.cardId
            );
          },
          refetchType: "all",
        });
      }
      if (boardId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.lists.board(boardId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.boards.detail(boardId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.planner.all,
      });
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
