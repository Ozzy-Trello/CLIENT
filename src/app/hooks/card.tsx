import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cards } from "../api/card";
import { ApiResponse, Card } from "../dto/types";
import { api } from "../api";

export function useCards(listId: string) {
  const queryClient = useQueryClient();
  
  // Main query for cards
  const cardsQuery = useQuery({
    queryKey: ["cards", listId],
    queryFn: () => cards(listId),
    enabled: !!listId,
    staleTime: 5000,
  });

  // Add a new card mutation with optimistic updates
  const addCardMutation = useMutation({
    mutationFn: ({ card, listId }: { card: Partial<Card>; listId: string }) => {
      return api.post(`/card`, card, {
        headers: {"list-id": listId}
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
            data: [...(old.data ?? []), tempCard]
          };
        }
      );
      
      // Also update the cards in the list cache if it exists
      // This ensures both the dedicated cards query and the list+cards query are in sync
      queryClient.setQueriesData(
        { queryKey: ["lists"] },
        (old: any) => {
          if (!old) return old;
          
          // Only proceed if old is an object with data property that's an array
          if (!old.data || !Array.isArray(old.data)) return old;
          
          return {
            ...old,
            data: old.data.map((list: any) => {
              if (list.id === listId) {
                return {
                  ...list,
                  cards: [...(list.cards || []), tempCard]
                };
              }
              return list;
            })
          };
        }
      );
      
      return { previousCards };
    },
    // If mutation fails, use the context from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(["cards", variables.listId], context.previousCards);
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
        }
      });
    },
  });

  // Update card mutation (for changing content, moving between lists, etc.)
  const updateCardMutation = useMutation({
    mutationFn: ({ 
      cardId, 
      updates, 
      listId,
      destinationListId 
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
              data: (old.data ?? []).map(card =>
                card.id === cardId ? { ...card, ...updates } : card
              )
            };
          }
        );
        
        return { previousCards, isMoveOperation: false };
      } else { // For moving a card between lists
        // Cancel queries for both source and destination lists
        await Promise.all([
          queryClient.cancelQueries({ queryKey: ["cards", listId] }),
          queryClient.cancelQueries({ queryKey: ["cards", destinationListId] })
        ]);
        
        // Get the current state for both lists
        const sourceCards = queryClient.getQueryData(["cards", listId]);
        const destinationCards = queryClient.getQueryData(["cards", destinationListId]);
        
        // Find the card to move
        const cardToMove = (sourceCards as ApiResponse<Card[]>)?.data?.find(
          card => card.id === cardId
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
              data: (old.data ?? []).filter(card => card.id !== cardId)
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
              data: [...(old.data ?? []), updatedCard]
            };
          }
        );
        
        return { 
          sourceCards, 
          destinationCards, 
          isMoveOperation: true,
          sourceLid: listId,
          destLid: destinationListId
        };
      }
    },
    onError: (err, variables, context) => {
      if (!context) return;
      
      if (!context.isMoveOperation) {
        // Simple update rollback
        if (context.previousCards) {
          queryClient.setQueryData(["cards", variables.listId], context.previousCards);
        }
      } else {
        // Move operation rollback - restore both lists
        if (context.sourceCards) {
          queryClient.setQueryData(["cards", context.sourceLid], context.sourceCards);
        }
        if (context.destinationCards) {
          queryClient.setQueryData(["cards", context.destLid], context.destinationCards);
        }
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: ["cards", variables.listId] });
      
      if (variables.destinationListId && variables.destinationListId !== variables.listId) {
        queryClient.invalidateQueries({ 
          queryKey: ["cards", variables.destinationListId] 
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
            data: (old.data ?? []).filter(card => card.id !== cardId)
          };
        }
      );
      
      return { previousCards };
    },
    onError: (err, variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(["cards", variables.listId], context.previousCards);
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