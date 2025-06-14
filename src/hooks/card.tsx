import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addCardLabel, cardArchive, cards, cardUnarchive, getCardLabels, moveCard, removeLabelFromCard, updateCard } from "../api/card";
import { api } from "../api";
import { ApiResponse } from "../types/type";
import { Card } from "../types/card";
import { useEffect } from "react";
import { queryKeys } from "@constants/query-keys";

export function useCards(listId: string, boardId: string) {
  const queryClient = useQueryClient();

  // Main query for cards
  const cardsQuery = useQuery({
    queryKey: queryKeys.cards.list(listId),
    queryFn: () => cards(listId, boardId),
    enabled: !!listId,
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
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId) });
      const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId));

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
      queryClient.setQueriesData( { queryKey: queryKeys.lists.board(boardId) }, (old: any) => {
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
    onError: (err, variables, context) => {
       if (context?.previousCards) {
        queryClient.setQueryData(
          queryKeys.cards.list(variables.listId),
          context.previousCards
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.board(boardId) });

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
        await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId!) });
        const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId!));

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
          queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId!) }),
          queryClient.cancelQueries({ queryKey: queryKeys.cards.list(destinationListId) }),
        ]);

        const sourceCards = queryClient.getQueryData(queryKeys.cards.list(listId!));
        const destinationCards = queryClient.getQueryData(queryKeys.cards.list(destinationListId));

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
      if (!variables.listId && !variables.destinationListId) {
        // For simple updates, invalidate the card detail and all card queries
        queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(variables.cardId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.cards.all });
        return;
      }

      // Invalidate affected lists
      if (variables.listId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.listId) });
      }

      if (variables.destinationListId && variables.destinationListId !== variables.listId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.destinationListId) });
      }

      // Invalidate board-level queries that might show card counts
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.board(boardId) });
    },
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: ({ cardId, listId }: { cardId: string; listId: string }) => {
      return api.delete(`/card/${cardId}`);
    },
    onMutate: async ({ cardId, listId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId) });
      const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId));

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
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.board(boardId) });
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
        queryClient.cancelQueries({ queryKey: queryKeys.lists.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.cards.list(previousListId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.cards.list(targetListId) }),
      ]);

      const previousListsData = queryClient.getQueryData<ApiResponse<any[]>>(queryKeys.lists.all);
      const previousSourceCards = queryClient.getQueryData<ApiResponse<Card[]>>(queryKeys.cards.list(previousListId));
      const previousTargetCards = queryClient.getQueryData<ApiResponse<Card[]>>(queryKeys.cards.list(targetListId));

      if (!previousListsData?.data) {
        console.error("No lists data found for optimistic update");
        return { noData: true };
      }

      // Deep clone for rollback
      const clonedListsData = JSON.parse(JSON.stringify(previousListsData));
      const clonedSourceCards = previousSourceCards ? JSON.parse(JSON.stringify(previousSourceCards)) : null;
      const clonedTargetCards = previousTargetCards ? JSON.parse(JSON.stringify(previousTargetCards)) : null;

      // Optimistically update lists cache
      queryClient.setQueryData<ApiResponse<any[]>>(queryKeys.lists.all, (old) => {
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
      queryClient.setQueryData<ApiResponse<Card[]>>(queryKeys.cards.list(previousListId), (old) => {
        if (!old?.data) return { data: [] };
        return {
          ...old,
          data: old.data.filter((card) => card.id !== cardId),
        };
      });

      // Optimistically update cards cache for target list
      queryClient.setQueryData<ApiResponse<Card[]>>(queryKeys.cards.list(targetListId), (old) => {
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
        queryClient.setQueryData(queryKeys.lists.all, context.previousLists);
      }
      if (context?.previousSourceCards && variables.previousListId) {
        queryClient.setQueryData(queryKeys.cards.list(variables.previousListId), context.previousSourceCards);
      }
      if (context?.previousTargetCards && variables.targetListId) {
        queryClient.setQueryData(queryKeys.cards.list(variables.targetListId), context.previousTargetCards);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.previousListId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.targetListId) });
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
