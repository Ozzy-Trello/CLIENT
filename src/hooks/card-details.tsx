import { cardArchive, cardDetails, cardUnarchive, updateCard } from "@api/card";
import api from "@api/index";
import { queryKeys } from "@constants/query-keys";
import { Card } from "@myTypes/card";
import { ApiResponse } from "@myTypes/type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCardDetails(
  cardId: string,
  listId: string,
  boardId: string
) {
  const queryClient = useQueryClient();

  const cardDetailsQuery = useQuery({
    queryKey: queryKeys.cards.detail(cardId),
    queryFn: () => cardDetails(cardId, boardId),
    enabled: !!cardId,
    staleTime: 5000,
    // Use any card data we might already have from the cards query
    initialData: () => {
      const cardsData = queryClient.getQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(listId)
      );
      if (!cardsData) return undefined;

      const foundCard = cardsData.data?.find((card) => card.id === cardId);
      return foundCard ? { data: foundCard } : undefined;
    },
  });

  // Mutation for updating the card
  const updateCardMutation = useMutation({
    mutationFn: (updates: Partial<Card>) => updateCard(cardId, updates),
    // Optimistic update
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.detail(cardId) });

      const previousCard = queryClient.getQueryData(queryKeys.cards.detail(cardId));

      // Update the individual card
      queryClient.setQueryData(
        queryKeys.cards.detail(cardId),
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
        queryKeys.cards.list(listId),
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
        queryClient.setQueryData(queryKeys.cards.detail(cardId), context.previousCard);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });

  // Mutation for deleting the card
  const deleteCardMutation = useMutation({
    mutationFn: () => {
      return api.delete(`/card/${cardId}`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.detail(cardId) });

      const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId));

      // Optimistically remove the card from the cards collection
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
        queryClient.setQueryData(queryKeys.cards.list(listId), context.previousCards);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
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
        queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.cards.list(destinationListId) }),
      ]);

      // Get current state of both lists
      const sourceCards = queryClient.getQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(listId)
      );
      const destinationCards = queryClient.getQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(destinationListId)
      );

      // Find the card to move
      const cardToMove = sourceCards?.data?.find((card) => card.id === cardId);

      if (!cardToMove) return { success: false };

      // Create updated card with new list ID
      const updatedCard = { ...cardToMove, listId: destinationListId };

      // Remove from source list
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

      // Add to destination list (with position handling if provided)
      queryClient.setQueryData(
        queryKeys.cards.list(destinationListId),
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
        queryKeys.cards.detail(cardId),
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
          queryKeys.cards.list(context.sourceLid),
          context.sourceCards
        );
      }

      if (context.destinationCards) {
        queryClient.setQueryData(
          queryKeys.cards.list(context.destLid),
          context.destinationCards
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });

  // Archive card mutation
  const archiveCardMutation = useMutation({
    mutationFn: ({ cardId }: { cardId: string }) => {
      return cardArchive(cardId);
    },
    onMutate: async ({ cardId }) => {
      // Cancel outgoing refetches for the affected list
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.detail(cardId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId) });

      const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId));

      // Optimistically update the card's archived status
      queryClient.setQueryData(
        queryKeys.cards.list(listId),
        (old: ApiResponse<Card[]> | undefined) => {
          if (!old) return { data: [] };

          return {
            ...old,
            data: (old.data ?? []).map((card) =>
              card.id === cardId 
                ? { ...card, archived: true, archivedAt: new Date().toISOString() }
                : card
            ),
          };
        }
      );

      // Also update the lists cache if it exists
      queryClient.setQueriesData({ queryKey: queryKeys.lists.all }, (old: any) => {
        if (!old || !old.data || !Array.isArray(old.data)) return old;

        return {
          ...old,
          data: old.data.map((list: any) => {
            if (list.id === listId && list.cards) {
              return {
                ...list,
                cards: list.cards.map((card: any) =>
                  card.id === cardId 
                    ? { ...card, archived: true, archivedAt: new Date().toISOString() }
                    : card
                ),
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
          queryKeys.cards.list(listId),
          context.previousCards
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });

  // Unarchive card mutation
  const unarchiveCardMutation = useMutation({
    mutationFn: ({ cardId }: { cardId: string }) => {
      return cardUnarchive(cardId);
    },
    onMutate: async ({ cardId }) => {
      // Cancel outgoing refetches for the affected list
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.detail(cardId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId) });

      const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId));

      // Optimistically update the card's archived status
      queryClient.setQueryData(
        queryKeys.cards.list(listId),
        (old: ApiResponse<Card[]> | undefined) => {
          if (!old) return { data: [] };

          return {
            ...old,
            data: (old.data ?? []).map((card) =>
              card.id === cardId 
                ? { ...card, archived: false, archivedAt: null }
                : card
            ),
          };
        }
      );

      // Also update the lists cache if it exists
      queryClient.setQueriesData({ queryKey: queryKeys.lists.all }, (old: any) => {
        if (!old || !old.data || !Array.isArray(old.data)) return old;

        return {
          ...old,
          data: old.data.map((list: any) => {
            if (list.id === listId && list.cards) {
              return {
                ...list,
                cards: list.cards.map((card: any) =>
                  card.id === cardId 
                    ? { ...card, archived: false, archivedAt: null }
                    : card
                ),
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
          queryKeys.cards.list(listId),
          context.previousCards
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
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

    archiveCard: archiveCardMutation.mutate,
    unarchiveCard: unarchiveCardMutation.mutate,
    isArchivingCard: archiveCardMutation.isPending,
    isUnarchivingCard: unarchiveCardMutation.isPending,
  };
}
