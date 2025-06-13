import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addCardLabel, cardArchive, cards, cardUnarchive, getCardLabels, moveCard, removeLabelFromCard, updateCard } from "../api/card";
import { api } from "../api";
import { ApiResponse } from "../types/type";
import { Card } from "../types/card";
import { useEffect } from "react";

export function useCards(listId: string, boardId: string) {
  const queryClient = useQueryClient();

  // Main query for cards
  const cardsQuery = useQuery({
    queryKey: ["cards", listId, boardId],
    queryFn: () => cards(listId, boardId),
    enabled: !!listId,
    staleTime: 5000,
  });

  // Add a new card mutation with optimistic updates
  const addCardMutation = useMutation({
    mutationFn: ({ card, listId }: { card: Partial<Card>; listId: string }) => {
      return api.post(`/card`, card, {
        headers: { "list-id": listId },
      });
    },
    // This runs before the API call to update the UI immediately
    onMutate: async ({ card, listId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cards", listId] });

      // Snapshot previous value
      const previousCards = queryClient.getQueryData(["cards", listId]);

      // Create temporary card for optimistic update
      const tempCard = {
        ...card,
        id: `temp-card-${Date.now()}`,
        createdAt: new Date().toISOString(),
        listId: listId,
      };

      // Update the UI optimistically
      queryClient.setQueryData(
        ["cards", listId],
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
      queryClient.setQueriesData({ queryKey: ["lists"] }, (old: any) => {
        if (!old) return old;

        // Only proceed if old is an object with data property that's an array
        if (!old.data || !Array.isArray(old.data)) return old;

        return {
          ...old,
          data: old.data.map((list: any) => {
            if (list.id === listId) {
              return {
                ...list,
                cards: [...(list.cards || []), tempCard],
              };
            }
            return list;
          }),
        };
      });

      return { previousCards };
    },
    // If mutation fails, use the context from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          ["cards", variables.listId],
          context.previousCards
        );
      }
      // Optionally show an error message
    },
    // Always reconcile after error or success
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cards", variables.listId] });

      // Also invalidate list queries that might contain card data
      queryClient.invalidateQueries({
        queryKey: ["lists"],
        // Use a predicate to only invalidate the specific list that contains these cards
        predicate: (query) => {
          const queryKey = query.queryKey;
          if (queryKey[0] === "lists" && queryKey.length > 1) {
            return true;
          }
          return false;
        },
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
        await queryClient.cancelQueries({ queryKey: ["cards", listId] });

        const previousCards = queryClient.getQueryData(["cards", listId]);

        // Update the UI optimistically
        queryClient.setQueryData(
          ["cards", listId],
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
          queryClient.cancelQueries({ queryKey: ["cards", listId] }),
          queryClient.cancelQueries({ queryKey: ["cards", destinationListId] }),
        ]);

        // Get the current state for both lists
        const sourceCards = queryClient.getQueryData(["cards", listId]);
        const destinationCards = queryClient.getQueryData([
          "cards",
          destinationListId,
        ]);

        // Find the card to move
        const cardToMove = (sourceCards as ApiResponse<Card[]>)?.data?.find(
          (card) => card.id === cardId
        );

        if (!cardToMove) return { isMoveOperation: false };

        // Updated card with new list ID
        const updatedCard = { ...cardToMove, listId: destinationListId };

        // Remove from source list
        queryClient.setQueryData(
          ["cards", listId],
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
          ["cards", destinationListId],
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
          sourceLid: listId,
          destLid: destinationListId,
        };
      }
    },
    onError: (err, variables, context) => {
      if (!context || context.isSimpleUpdate) return;

      if (!context.isMoveOperation) {
        // Simple update rollback
        if (context.previousCards && context.listId) {
          queryClient.setQueryData(
            ["cards", context.listId],
            context.previousCards
          );
        }
      } else {
        // Move operation rollback - restore both lists
        if (context.sourceCards) {
          queryClient.setQueryData(
            ["cards", context.sourceLid],
            context.sourceCards
          );
        }
        if (context.destinationCards) {
          queryClient.setQueryData(
            ["cards", context.destLid],
            context.destinationCards
          );
        }
      }
    },
    onSettled: (data, error, variables) => {
      // For simple updates (no listId/destinationListId), invalidate all card-related queries
      if (!variables.listId && !variables.destinationListId) {
        // Invalidate all card queries
        queryClient.invalidateQueries({ 
          queryKey: ["cards"],
          type: "all" 
        });
        // Also invalidate specific card details if you have those queries
        queryClient.invalidateQueries({ 
          queryKey: ["cardDetails", variables.cardId] 
        });
        return;
      }

      // For list-specific updates, invalidate affected queries
      if (variables.listId) {
        queryClient.invalidateQueries({ queryKey: ["cards", variables.listId] });
      }

      if (
        variables.destinationListId &&
        variables.destinationListId !== variables.listId
      ) {
        queryClient.invalidateQueries({
          queryKey: ["cards", variables.destinationListId],
        });
      }

      // Also refresh lists data that might contain cards
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: ({ cardId, listId }: { cardId: string; listId: string }) => {
      return api.delete(`/card/${cardId}`);
    },
    onMutate: async ({ cardId, listId }) => {
      await queryClient.cancelQueries({ queryKey: ["cards", listId] });

      const previousCards = queryClient.getQueryData(["cards", listId]);

      // Remove the card optimistically
      queryClient.setQueryData(
        ["cards", listId],
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
          ["cards", variables.listId],
          context.previousCards
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cards", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
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
 * Hook to manage card movement between lists or within a list
 */
export function useCardMove() {
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
  onMutate: async ({
    cardId,
    targetListId,
    previousListId,
    targetPosition,
    previousPosition,
  }) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: ["lists"] }),
      queryClient.cancelQueries({ queryKey: ["cards", previousListId] }),
      queryClient.cancelQueries({ queryKey: ["cards", targetListId] }),
    ]);

    const previousListsData = queryClient.getQueryData<ApiResponse<any[]>>(["lists"]);
    const previousSourceCards = queryClient.getQueryData<ApiResponse<Card[]>>(["cards", previousListId]);
    const previousTargetCards = queryClient.getQueryData<ApiResponse<Card[]>>(["cards", targetListId]);

    if (!previousListsData?.data) {
      console.error("No lists data found for optimistic update");
      return { noData: true };
    }

    // Deep clone for rollback
    const clonedListsData = JSON.parse(JSON.stringify(previousListsData));
    const clonedSourceCards = previousSourceCards ? JSON.parse(JSON.stringify(previousSourceCards)) : null;
    const clonedTargetCards = previousTargetCards ? JSON.parse(JSON.stringify(previousTargetCards)) : null;

    // Optimistically update lists cache
    queryClient.setQueryData<ApiResponse<any[]>>(["lists"], (old) => {
      if (!old?.data) return old;
      const lists = JSON.parse(JSON.stringify(old.data));
      const sourceList = lists.find((list: any) => list.id === previousListId);
      const targetList = lists.find((list: any) => list.id === targetListId);

      if (!sourceList || !sourceList.cards) {
        console.error("Source list not found:", previousListId);
        return old;
      }
      if (!targetList) {
        console.error("Target list not found:", targetListId);
        return old;
      }
      if (!targetList.cards) targetList.cards = [];

      // Remove from source
      const cardIndex = sourceList.cards.findIndex((card: any) => card.id === cardId);
      if (cardIndex === -1) {
        console.error("Card not found in source list:", cardId);
        return old;
      }
      const card = { ...sourceList.cards[cardIndex] };
      sourceList.cards.splice(cardIndex, 1);

      // Insert into target at position
      const insertPosition = Math.min(targetPosition, targetList.cards.length);
      targetList.cards.splice(insertPosition, 0, { ...card, listId: targetListId });

      // Fix order values for both lists
      sourceList.cards.forEach((c: any, idx: number) => {
        c.order = (idx + 1) * 10000;
      });
      targetList.cards.forEach((c: any, idx: number) => {
        c.order = (idx + 1) * 10000;
      });

      return {
        ...old,
        data: lists,
      };
    });

    // Optimistically update cards cache for source list
    queryClient.setQueryData<ApiResponse<Card[]>>(["cards", previousListId], (old) => {
      if (!old?.data) return { data: [] };
      return {
        ...old,
        data: old.data.filter((card) => card.id !== cardId),
      };
    });

  // Optimistically update cards cache for target list
  queryClient.setQueryData<ApiResponse<Card[]>>(["cards", targetListId], (old) => {
    if (!old?.data) return { data: [] };
    // Find the card from the source list
    const cardToMove = previousSourceCards?.data?.find(c => c.id === cardId);
    // If the card is not found, return the old data to prevent errors
    if (!cardToMove) {
      console.warn(`Card with id ${cardId} not found in source list ${previousListId}`);
      return old;
    }
    // Insert card at targetPosition
    const newCards = [...old.data];
    newCards.splice(targetPosition, 0, { ...cardToMove, listId: targetListId });
    // Reorder cards for consistency
    newCards.forEach((c, idx) => (c.order = (idx + 1) * 10000));
    return {
      ...old,
      data: newCards,
    };
  });

  return {
    previousLists: clonedListsData,
    previousSourceCards: clonedSourceCards,
    previousTargetCards: clonedTargetCards,
  };
  },
  onError: (error, variables, context) => {
    console.error("Error moving card:", error);
    if (context?.previousLists) {
      queryClient.setQueryData(["lists"], context.previousLists);
    }
    if (context?.previousSourceCards && variables.previousListId) {
      queryClient.setQueryData(["cards", variables.previousListId], context.previousSourceCards);
    }
    if (context?.previousTargetCards && variables.targetListId) {
      queryClient.setQueryData(["cards", variables.targetListId], context.previousTargetCards);
    }
  },
  onSettled: (data, error, variables) => {
    queryClient.invalidateQueries({ queryKey: ["lists"] });
    queryClient.invalidateQueries({ queryKey: ["cards", variables.previousListId] });
    queryClient.invalidateQueries({ queryKey: ["cards", variables.targetListId] });
  },

  });

  return {
    moveCard: cardMoveMutation.mutate,
    isMovingCard: cardMoveMutation.isPending,
    moveCardError: cardMoveMutation.error,
  };
}

/**
 * Hook to get time a card has spent in a specific board
 */
export function useCardTimeInBoard(cardId: string, boardId: string) {
  const queryClient = useQueryClient();

  // Query for card time in board data
  const cardTimeInBoardQuery = useQuery({
    queryKey: ["card-time-in-board", cardId, boardId],
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


export function useWebSocketCardUpdates(socket: WebSocket | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WEBSOCKET DITERIMA!");

        if (message.event === "card:moved") {
          const { card, fromListId, toListId } = message.data;

          // Remove card from old list
          queryClient.setQueryData(["cards", fromListId], (old: ApiResponse<Card[]> | undefined) => {
            if (!old) return { data: [] };
            return {
              ...old,
              data: (old.data ?? []).filter((c) => c.id !== card.id),
            };
          });

          // Add card to new list
          queryClient.setQueryData(["cards", toListId], (old: ApiResponse<Card[]> | undefined) => {
            if (!old) return { data: [card] };
            return {
              ...old,
              data: [...(old.data ?? []).filter((c) => c.id !== card.id), card],
            };
          });

          // Also update "lists" cache if needed
          queryClient.invalidateQueries({ queryKey: ["lists"] });
        }

        if (message.event === "card:updated") {
          const { card, listId } = message.data;
          queryClient.setQueryData(["cards", listId], (old: ApiResponse<Card[]> | undefined) => {
            if (!old) return { data: [card] };
            return {
              ...old,
              data: (old.data || []).map((c) => (c.id === card.id ? card : c)),
            };
          });
        }

        // Add more event types as needed
      } catch (e) {
        console.error("Invalid WS data", e);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, queryClient]);
}