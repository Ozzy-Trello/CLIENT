import { cardArchive, cardDetails, cardUnarchive, updateCard } from "@api/card";
import api from "@api/index";
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
    queryKey: ["card", cardId],
    queryFn: () => cardDetails(cardId, boardId),
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
    mutationFn: (updates: Partial<Card>) => updateCard(cardId, updates),
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
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });

  // Mutation for deleting the card
  const deleteCardMutation = useMutation({
    mutationFn: () => {
      return api.delete(`/card/${cardId}`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["card", cardId] });

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

  
  // Archive card mutation
  const archiveCardMutation = useMutation({
    mutationFn: ({ cardId }: { cardId: string }) => {
      return cardArchive(cardId);
    },
    onMutate: async ({ cardId }) => {
      // Cancel outgoing refetches for the affected list
      await queryClient.cancelQueries({ queryKey: ["card", cardId] });
      await queryClient.cancelQueries({ queryKey: ["cards", listId] });

      const previousCards = queryClient.getQueryData(["cards", listId]);

      // Optimistically update the card's archived status
      queryClient.setQueryData(
        ["cards", listId],
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
      queryClient.setQueriesData({ queryKey: ["lists"] }, (old: any) => {
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
          ["cards", listId],
          context.previousCards
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["cards", listId] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });

  // Unarchive card mutation
  const unarchiveCardMutation = useMutation({
    mutationFn: ({ cardId }: { cardId: string }) => {
      return cardUnarchive(cardId);
    },
    onMutate: async ({ cardId }) => {
      // Cancel outgoing refetches for the affected list
      await queryClient.cancelQueries({ queryKey: ["card", cardId] });
      await queryClient.cancelQueries({ queryKey: ["cards", listId] });

      const previousCards = queryClient.getQueryData(["cards", listId]);

      // Optimistically update the card's archived status
      queryClient.setQueryData(
        ["cards", listId],
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
      queryClient.setQueriesData({ queryKey: ["lists"] }, (old: any) => {
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
          ["cards", listId],
          context.previousCards
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

    archiveCard: archiveCardMutation.mutate,
    unarchiveCard: unarchiveCardMutation.mutate,
    isArchivingCard: archiveCardMutation.isPending,
    isUnarchivingCard: unarchiveCardMutation.isPending,
  };
}
