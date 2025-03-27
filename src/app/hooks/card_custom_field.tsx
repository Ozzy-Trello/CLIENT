import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cardCustomFields } from "../api/card_custom_field";
import { ApiResponse, CardCustomField } from "../dto/types";
import { api } from "../api";


export const useCardCustomField = (cardId: string) => {
  const queryClient = useQueryClient();
  
  // Main query for card custom fields
  const cardCustomFieldQuery = useQuery({
    queryKey: ["cardCustomField", cardId],
    queryFn: () => cardCustomFields(cardId),
    enabled: !!cardId,
    staleTime: 5000,
  });

  // Add custom field value mutation with optimistic updates
  const addCustomFieldMutation = useMutation({
    mutationFn: ({
      value, 
      customFieldId, 
      cardId
    } : {
      value: string, 
      customFieldId: string, 
      cardId: string
    }) => {
      const param = {
        value,
        customFieldId,
        cardId
      };
      return api.post(`/card/${cardId}/custom-field/${customFieldId}`, param);
    },
    onMutate: async({ value, customFieldId, cardId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cardCustomField", cardId] });
      
      // Snapshot previous value
      const previousCustomFields = queryClient.getQueryData(["cardCustomField", cardId]);
      
      // Create temporary custom field value for optimistic update
      const tempCustomField: CardCustomField = {
        customFieldId,
        cardId,
        value
      };
      
      // Update the UI optimistically
      queryClient.setQueryData(
        ["cardCustomField", cardId],
        (old: ApiResponse<CardCustomField[]> | undefined) => {
          if (!old) return { data: [tempCustomField] };
          
          // Check if this custom field already exists
          const existingIndex = old.data?.findIndex(cf => cf.customFieldId === customFieldId);
          
          if (existingIndex !== undefined && existingIndex >= 0 && old.data) {
            // Update existing custom field
            const updatedData = [...old.data];
            updatedData[existingIndex] = { 
              ...updatedData[existingIndex], 
              value
            };
            return { ...old, data: updatedData };
          } else {
            // Add new custom field
            return {
              ...old,
              data: [...(old.data ?? []), tempCustomField]
            };
          }
        }
      );
      
      // Also update the card data in cache if it exists
      updateCardInCache(queryClient, cardId, customFieldId, value);
      
      return { previousCustomFields };
    },
    onError: (err, variables, context) => {
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["cardCustomField", variables.cardId], 
          context.previousCustomFields
        );
      }
      // Optionally show an error message
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["cardCustomField", variables.cardId] 
      });
      
      // Also invalidate card queries that might contain custom field data
      queryClient.invalidateQueries({ 
        queryKey: ["cards"],
        predicate: (query) => {
          const queryKey = query.queryKey;
          return queryKey[0] === "cards";
        }
      });
    },
  });

  // Update custom field value mutation
  const updateCustomFieldMutation = useMutation({
    mutationFn: ({
      value, 
      customFieldId, 
      cardId
    } : {
      value: string, 
      customFieldId: string, 
      cardId: string
    }) => {
      const param = {
        value
      };
      return api.put(`/card/${cardId}/custom-field/${customFieldId}`, param);
    },
    onMutate: async({ value, customFieldId, cardId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cardCustomField", cardId] });
      
      // Snapshot previous value
      const previousCustomFields = queryClient.getQueryData(["cardCustomField", cardId]);
      
      // Update the UI optimistically
      queryClient.setQueryData(
        ["cardCustomField", cardId],
        (old: ApiResponse<CardCustomField[]> | undefined) => {
          if (!old) return { data: [] };
          
          return {
            ...old,
            data: (old.data ?? []).map(customField =>
              customField.customFieldId === customFieldId 
                ? { ...customField, value } 
                : customField
            )
          };
        }
      );
      
      // Also update the card data in cache if it exists
      updateCardInCache(queryClient, cardId, customFieldId, value);
      
      return { previousCustomFields };
    },
    onError: (err, variables, context) => {
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["cardCustomField", variables.cardId], 
          context.previousCustomFields
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["cardCustomField", variables.cardId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["cards"]
      });
    },
  });

  // Delete custom field value mutation
  const deleteCustomFieldMutation = useMutation({
    mutationFn: ({
      customFieldId, 
      cardId
    } : {
      customFieldId: string, 
      cardId: string
    }) => {
      return api.delete(`/card/${cardId}/custom-field/${customFieldId}`);
    },
    onMutate: async({ customFieldId, cardId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cardCustomField", cardId] });
      
      // Snapshot previous value
      const previousCustomFields = queryClient.getQueryData(["cardCustomField", cardId]);
      
      // Update the UI optimistically
      queryClient.setQueryData(
        ["cardCustomField", cardId],
        (old: ApiResponse<CardCustomField[]> | undefined) => {
          if (!old) return { data: [] };
          
          return {
            ...old,
            data: (old.data ?? []).filter(customField => 
              customField.customFieldId !== customFieldId
            )
          };
        }
      );
      
      // Also update the card data in cache if it exists
      updateCardInCache(queryClient, cardId, customFieldId, null, true);
      
      return { previousCustomFields };
    },
    onError: (err, variables, context) => {
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["cardCustomField", variables.cardId], 
          context.previousCustomFields
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["cardCustomField", variables.cardId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["cards"]
      });
    },
  });

  // Helper function to update card in cache when custom fields change
  function updateCardInCache(
    queryClient: any, 
    cardId: string, 
    customFieldId: string, 
    value: string | null,
    isDelete: boolean = false
  ) {
    // Update card data in the cards cache
    queryClient.setQueriesData(
      { queryKey: ["cards"] },
      (old: any) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: (old.data || []).map((card: any) => {
            if (card.id === cardId) {
              // Deep clone to avoid mutation
              const updatedCard = { ...card };
              
              // Initialize customFields array if it doesn't exist
              if (!updatedCard.customFields) {
                updatedCard.customFields = [];
              }
              
              if (isDelete) {
                // Remove the custom field
                updatedCard.customFields = updatedCard.customFields.filter(
                  (cf: any) => cf.customFieldId !== customFieldId
                );
              } else {
                // Find if the custom field already exists
                const existingIndex = updatedCard.customFields.findIndex(
                  (cf: any) => cf.customFieldId === customFieldId
                );
                
                if (existingIndex >= 0) {
                  // Update existing field
                  updatedCard.customFields = [...updatedCard.customFields];
                  updatedCard.customFields[existingIndex] = {
                    ...updatedCard.customFields[existingIndex],
                    value
                  };
                } else {
                  // Add new field
                  updatedCard.customFields = [
                    ...updatedCard.customFields,
                    { customFieldId, cardId, value }
                  ];
                }
              }
              
              return updatedCard;
            }
            return card;
          })
        };
      }
    );

    // Also update lists cache if it contains cards
    queryClient.setQueriesData(
      { queryKey: ["lists"] },
      (old: any) => {
        if (!old || !old.data) return old;
        
        return {
          ...old,
          data: old.data.map((list: any) => {
            if (!list.cards) return list;
            
            return {
              ...list,
              cards: list.cards.map((card: any) => {
                if (card.id === cardId) {
                  // Deep clone to avoid mutation
                  const updatedCard = { ...card };
                  
                  // Initialize customFields array if it doesn't exist
                  if (!updatedCard.customFields) {
                    updatedCard.customFields = [];
                  }
                  
                  if (isDelete) {
                    // Remove the custom field
                    updatedCard.customFields = updatedCard.customFields.filter(
                      (cf: any) => cf.customFieldId !== customFieldId
                    );
                  } else {
                    // Find if the custom field already exists
                    const existingIndex = updatedCard.customFields.findIndex(
                      (cf: any) => cf.customFieldId === customFieldId
                    );
                    
                    if (existingIndex >= 0) {
                      // Update existing field
                      updatedCard.customFields = [...updatedCard.customFields];
                      updatedCard.customFields[existingIndex] = {
                        ...updatedCard.customFields[existingIndex],
                        value
                      };
                    } else {
                      // Add new field
                      updatedCard.customFields = [
                        ...updatedCard.customFields,
                        { customFieldId, cardId, value }
                      ];
                    }
                  }
                  
                  return updatedCard;
                }
                return card;
              })
            };
          })
        };
      }
    );
  }

  return {
    cardCustomFields: cardCustomFieldQuery.data?.data || [],
    isLoading: cardCustomFieldQuery.isLoading,
    isError: cardCustomFieldQuery.isError,
    error: cardCustomFieldQuery.error,
    addCustomField: addCustomFieldMutation.mutate,
    updateCustomField: updateCustomFieldMutation.mutate,
    deleteCustomField: deleteCustomFieldMutation.mutate,
    isAddingCustomField: addCustomFieldMutation.isPending,
    isUpdatingCustomField: updateCustomFieldMutation.isPending,
    isDeletingCustomField: deleteCustomFieldMutation.isPending,
  };
};