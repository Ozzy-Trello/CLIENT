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
    updateCard: updateCardMutation.mutate,
    deleteCard: deleteCardMutation.mutate,
    isAddingCard: addCardMutation.isPending,
    isUpdatingCard: updateCardMutation.isPending,
    isDeletingCard: deleteCardMutation.isPending,
  };
}

/**
 * Hook for paginated cards with load more functionality
 */
export function useCardsPaginated(listId: string, boardId: string) {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [hasMoreCards, setHasMoreCards] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [totalCards, setTotalCards] = useState<number>(0);
  const limit = 20;
  const allCardsRef = useRef<Card[]>([]);

  useEffect(() => {
    allCardsRef.current = allCards;
  }, [allCards]);

  // Initial query for first page
  const cardsQuery = useQuery({
    queryKey: queryKeys.cards.list(listId),
    queryFn: () => cards(listId, boardId, 1, limit),
    enabled: !!listId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3,
    staleTime: 60000,
  });

  // Reset pagination when listId changes and initialize from cache if available
  useEffect(() => {
    setCurrentPage(1);
    setIsLoadingMore(false);
    setLoadMoreError(null);
    setTotalCards(0);
    
    // Check if we have cached data for this listId
    const cachedData = queryClient.getQueryData<ApiResponse<Card[]>>(
      queryKeys.cards.list(listId)
    );
    
    if (cachedData?.data && Array.isArray(cachedData.data)) {
      const totalCount =
        cachedData.paginate?.totalData ?? cachedData.data.length;
      setTotalCards(totalCount);
      setAllCards(cachedData.data);
      setHasMoreCards(cachedData.data.length < totalCount);
      const derivedPage = Math.max(
        1,
        Math.ceil(cachedData.data.length / limit)
      );
      setCurrentPage(derivedPage);
    } else {
      // No cached data, reset to empty state
      setAllCards([]);
      setHasMoreCards(true);
    }
  }, [listId, queryClient, limit]);

  // Update allCards when initial query data changes (for fresh data)
  useEffect(() => {
    if (cardsQuery.data?.data && !cardsQuery.isLoading) {
      const totalCount =
        cardsQuery.data.paginate?.totalData ?? cardsQuery.data.data.length;
      setTotalCards(totalCount);
      const incomingCards = cardsQuery.data.data;
      const previousCards = allCardsRef.current;

      const mergedCards =
        !previousCards.length || previousCards.length <= incomingCards.length
          ? incomingCards
          : (() => {
              const incomingIds = new Set(
                incomingCards.map((card) => card.id)
              );
              const remaining = previousCards.filter(
                (card) => !incomingIds.has(card.id)
              );
              return [...incomingCards, ...remaining];
            })();

      setAllCards(mergedCards);
      setHasMoreCards(mergedCards.length < totalCount);
      setCurrentPage(Math.ceil(mergedCards.length / limit) || 1);

      queryClient.setQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(listId),
        {
          ...cardsQuery.data,
          data: mergedCards,
          paginate: {
            ...(cardsQuery.data.paginate || {}),
            totalData: totalCount,
          },
        }
      );

      setLoadMoreError(null);
    }
  }, [cardsQuery.data?.data, cardsQuery.isLoading, limit, queryClient, listId]);

  // Load more cards function
  const loadMoreCards = useCallback(async () => {
    if (!hasMoreCards || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadMoreError(null); // Clear previous errors

    try {
      const nextPage = currentPage + 1;
      const response = await cards(listId, boardId, nextPage, limit);

      const responseData = response.data;
      if (
        responseData &&
        Array.isArray(responseData) &&
        responseData.length > 0
      ) {
        const newAllCards = [...allCards, ...responseData];
        setAllCards(newAllCards);
        setCurrentPage(nextPage);
        const updatedTotal =
          response.paginate?.totalData ?? totalCards ?? newAllCards.length;
        setTotalCards(updatedTotal);
        setHasMoreCards(newAllCards.length < updatedTotal);

        // Update the query cache with all cards for drag-and-drop compatibility
        queryClient.setQueryData<ApiResponse<Card[]>>(
          queryKeys.cards.list(listId),
          (old) => {
            const totalPages = Math.max(1, Math.ceil(updatedTotal / limit));
            const paginate = {
              limit,
              page: nextPage,
              totalData: updatedTotal,
              totalPage:
                response.paginate?.totalPage ?? totalPages,
              nextPage:
                response.paginate?.nextPage ??
                (nextPage < totalPages ? nextPage + 1 : totalPages),
              prevPage:
                response.paginate?.prevPage ??
                (nextPage > 1 ? nextPage - 1 : 1),
            };
            return {
              ...old,
              status_code: 200,
              message: "Success",
              data: newAllCards,
              paginate,
            };
          }
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
      try { console.log('reorder:mutation:settled', variables); } catch {}
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
        try { console.log('reorder:refetch'); } catch {}
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
