import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cards, moveCard } from "../api/card";
import { api } from "../api";
import { ApiResponse } from "../types/type";
import { Card } from "../types/card";

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
      listId: string;
      destinationListId?: string; // Only needed for moving cards between lists
    }) => {
      return api.put(`/card/${cardId}`, updates);
    },
    onMutate: async ({ cardId, updates, listId, destinationListId }) => {
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

        return { previousCards, isMoveOperation: false };
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
      if (!context) return;

      if (!context.isMoveOperation) {
        // Simple update rollback
        if (context.previousCards) {
          queryClient.setQueryData(
            ["cards", variables.listId],
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
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: ["cards", variables.listId] });

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

export function useCardDetails(
  cardId: string,
  listId: string,
  boardId: string
) {
  const queryClient = useQueryClient();

  const cardDetailsQuery = useQuery({
    queryKey: ["card", cardId, boardId],
    queryFn: () =>
      api
        .get(`/card/${cardId}`, {
          headers: {
            "board-id": boardId,
          },
        })
        .then((res) => res.data),
    enabled: !!cardId,
    staleTime: 5000,
    // Use any card data we might already have from the cards query
    initialData: () => {
      const cardsData = queryClient.getQueryData<ApiResponse<Card[]>>([
        "cards",
        listId,
      ]);
      if (!cardsData) return undefined;

      const foundCard = cardsData.data?.find((card) => card.id === cardId);
      return foundCard ? { data: foundCard } : undefined;
    },
  });

  // Mutation for updating the card
  const updateCardMutation = useMutation({
    mutationFn: (updates: Partial<Card>) => {
      return api.put(`/card/${cardId}`, updates);
    },
    // Optimistic update
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["card", cardId] });

      const previousCard = queryClient.getQueryData(["card", cardId]);

      // Update the individual card
      queryClient.setQueryData(
        ["card", cardId],
        (old: ApiResponse<Card> | undefined) => {
          if (!old) return { data: { ...updates, id: cardId, listId } as Card };
          return {
            ...old,
            data: { ...old.data, ...updates },
          };
        }
      );

      // Also update the card in the cards collection if it exists
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

      return { previousCard };
    },
    onError: (err, variables, context) => {
      if (context?.previousCard) {
        queryClient.setQueryData(["card", cardId], context.previousCard);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards", listId] });
      // Also refresh lists data that might contain the card
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });

  // Mutation for deleting the card
  const deleteCardMutation = useMutation({
    mutationFn: () => {
      return api.delete(`/card/${cardId}`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["cards", listId] });

      const previousCards = queryClient.getQueryData(["cards", listId]);

      // Optimistically remove the card from the cards collection
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
        queryClient.setQueryData(["cards", listId], context.previousCards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });

  // Mutation for moving a card to another list
  const moveCardMutation = useMutation({
    mutationFn: ({
      destinationListId,
      position,
    }: {
      destinationListId: string;
      position?: number;
    }) => {
      return api.put(`/card/${cardId}/move`, {
        destinationListId,
        position,
      });
    },
    onMutate: async ({ destinationListId, position }) => {
      // Cancel queries for both source and destination lists
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["cards", listId] }),
        queryClient.cancelQueries({ queryKey: ["cards", destinationListId] }),
      ]);

      // Get current state of both lists
      const sourceCards = queryClient.getQueryData<ApiResponse<Card[]>>([
        "cards",
        listId,
      ]);
      const destinationCards = queryClient.getQueryData<ApiResponse<Card[]>>([
        "cards",
        destinationListId,
      ]);

      // Find the card to move
      const cardToMove = sourceCards?.data?.find((card) => card.id === cardId);

      if (!cardToMove) return { success: false };

      // Create updated card with new list ID
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

      // Add to destination list (with position handling if provided)
      queryClient.setQueryData(
        ["cards", destinationListId],
        (old: ApiResponse<Card[]> | undefined) => {
          if (!old) return { data: [updatedCard] };

          let newData = [...(old.data ?? [])];

          if (
            position !== undefined &&
            position >= 0 &&
            position <= newData.length
          ) {
            // Insert at specific position
            newData.splice(position, 0, updatedCard);
          } else {
            // Add to end
            newData.push(updatedCard);
          }

          return {
            ...old,
            data: newData,
          };
        }
      );

      // Update the individual card data as well
      queryClient.setQueryData(
        ["card", cardId],
        (old: ApiResponse<Card> | undefined) => {
          if (!old) return { data: updatedCard };
          return {
            ...old,
            data: { ...old.data, listId: destinationListId },
          };
        }
      );

      return {
        sourceCards,
        destinationCards,
        sourceLid: listId,
        destLid: destinationListId,
        success: true,
      };
    },
    onError: (err, variables, context) => {
      if (!context || !context.success) return;

      // Restore both lists to previous state
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });

  return {
    card: cardDetailsQuery.data?.data,
    isLoading: cardDetailsQuery.isLoading,
    isError: cardDetailsQuery.isError,
    error: cardDetailsQuery.error,
    updateCard: updateCardMutation.mutate,
    isUpdating: updateCardMutation.isPending,
    deleteCard: deleteCardMutation.mutate,
    isDeleting: deleteCardMutation.isPending,
    moveCard: moveCardMutation.mutate,
    isMoving: moveCardMutation.isPending,
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
      console.log("Optimistically moving card:", {
        cardId,
        targetListId,
        previousListId,
        targetPosition,
      });

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["lists", "cards"] });

      // Get snapshot of current state
      const previousListsData = queryClient.getQueryData<ApiResponse<any[]>>([
        "lists",
      ]);

      if (!previousListsData?.data) {
        console.error("No lists data found for optimistic update");
        return { noData: true };
      }

      // Deep clone to avoid reference issues
      const clonedListsData = JSON.parse(JSON.stringify(previousListsData));

      queryClient.setQueryData<ApiResponse<any[]>>(["lists"], (old) => {
        if (!old?.data) return old;

        // Clone the data to avoid mutation
        const lists = JSON.parse(JSON.stringify(old.data));

        // Find source list
        const sourceList = lists.find(
          (list: any) => list.id === previousListId
        );
        if (!sourceList || !sourceList.cards) {
          console.error("Source list not found:", previousListId);
          return old;
        }

        // Find card in source list
        const cardIndex = sourceList.cards.findIndex(
          (card: any) => card.id === cardId
        );
        if (cardIndex === -1) {
          console.error("Card not found in source list:", cardId);
          return old;
        }

        // Save a copy of the card
        const card = { ...sourceList.cards[cardIndex] };

        // Remove card from source list
        sourceList.cards.splice(cardIndex, 1);

        // Find target list
        const targetList = lists.find((list: any) => list.id === targetListId);
        if (!targetList) {
          console.error("Target list not found:", targetListId);
          return old;
        }

        // Ensure target list has cards array
        if (!targetList.cards) targetList.cards = [];

        // Insert card at target position
        const insertPosition = Math.min(
          targetPosition,
          targetList.cards.length
        );
        targetList.cards.splice(insertPosition, 0, card);

        // Fix order values to ensure consistent sorting
        targetList.cards.forEach((c: any, idx: number) => {
          c.order = (idx + 1) * 10000;
        });

        return {
          ...old,
          data: lists,
        };
      });

      // Return previous state for rollback
      return {
        previousLists: clonedListsData,
        cardId,
        previousListId,
        targetListId,
      };
    },
    onError: (error, variables, context) => {
      console.error("Error moving card:", error);

      // Revert to snapshot on error
      if (context && !context.noData && context.previousLists) {
        queryClient.setQueryData(["lists"], context.previousLists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
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
