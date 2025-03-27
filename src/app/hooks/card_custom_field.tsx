import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cardCustomFields } from "../api/card_custom_field";
import { ApiResponse, CardCustomField, Trigger } from "../dto/types";
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
      value: Trigger, 
      customFieldId: string, 
      cardId: string
    }) => {
      console.log("API - Adding custom field:", { value, customFieldId, cardId });
      // const param = {
      //   value,
      //   customFieldId,
      //   cardId
      // };

      const params = {
        trigger: value,
        value: "e6097fcc-a35b-4a22-9556-8f648c87b103"
      } 

      return api.post(`/card/${cardId}/custom-field/${customFieldId}`, params);
    },
    onMutate: async({ value, customFieldId, cardId }) => {
      console.log("Optimistically adding custom field:", { value, customFieldId, cardId });
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cardCustomField", cardId] });
      
      // Snapshot previous value
      const previousCustomFields = queryClient.getQueryData(["cardCustomField", cardId]);
      
      // Create temporary custom field value for optimistic update
      const tempCustomField: CardCustomField = {
        customFieldId,
        cardId,
        value: ""
      };

      try {
        // Update the UI optimistically
        queryClient.setQueryData(
          ["cardCustomField", cardId],
          (old: ApiResponse<CardCustomField[]> | undefined) => {
            if (!old) return { data: [tempCustomField] };
            
            const oldData = old.data || [];
            // Make sure old.data is an array
            const safeOldData = Array.isArray(oldData) ? oldData : [];
            
            // Check if this custom field already exists
            const existingIndex = safeOldData.findIndex(cf => cf.customFieldId === customFieldId);
            
            if (existingIndex !== undefined && existingIndex >= 0) {
              // Update existing custom field
              const updatedData = [...safeOldData];
              updatedData[existingIndex] = { 
                ...updatedData[existingIndex], 
                value: ""
              };
              return { ...old, data: updatedData };
            } else {
              // Add new custom field
              return {
                ...old,
                data: [...safeOldData, tempCustomField]
              };
            }
          }
        );
      } catch (error) {
        console.error("Error in optimistic update:", error);
      }
      
      // Also update the card data in cache if it exists
      try {
        updateCardInCache(queryClient, cardId, customFieldId, "");
      } catch (error) {
        console.error("Error updating card cache:", error);
      }
      
      return { previousCustomFields };
    },
    onError: (err, variables, context) => {
      console.error("Error adding custom field:", err);
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["cardCustomField", variables.cardId], 
          context.previousCustomFields
        );
      }
    },
    onSuccess: (data, variables) => {
      console.log("Successfully added custom field:", variables);
    },
    onSettled: (data, error, variables) => {
      console.log("Add custom field settled, invalidating queries");
      queryClient.invalidateQueries({ 
        queryKey: ["cardCustomField", variables.cardId] 
      });
      
      // Also invalidate card queries that might contain custom field data
      queryClient.invalidateQueries({ 
        queryKey: ["cards"]
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
      value: string | number | boolean, 
      customFieldId: string, 
      cardId: string
    }) => {
      console.log("API - Updating custom field:", { value, customFieldId, cardId });
      // Convert value to string if it's not already
      const stringValue = value?.toString() || "";
      const param = {
        value: stringValue
      };
      
      // Make sure all parameters are defined before making the request
      if (!cardId || !customFieldId) {
        console.error("Missing required parameters:", { cardId, customFieldId });
        return Promise.reject(new Error("Missing required parameters"));
      }
      
      // Make a direct API call
      return api.put(`/card/${cardId}/custom-field/${customFieldId}`, param);
    },
    onMutate: async({ value, customFieldId, cardId }) => {
      console.log("Optimistically updating custom field:", { value, customFieldId, cardId });
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cardCustomField", cardId] });
      
      // Snapshot previous value
      const previousCustomFields = queryClient.getQueryData(["cardCustomField", cardId]);
      
      // Convert value to string if it's not already
      const stringValue = value?.toString() || "";
      
      try {
        // Update the UI optimistically
        queryClient.setQueryData(
          ["cardCustomField", cardId],
          (old: ApiResponse<CardCustomField[]> | undefined) => {
            if (!old) return { data: [] };
            
            const oldData = old.data || [];
            // Make sure old.data is an array
            const safeOldData = Array.isArray(oldData) ? oldData : [];
            
            return {
              ...old,
              data: safeOldData.map(customField =>
                customField.customFieldId === customFieldId 
                  ? { ...customField, value: stringValue } 
                  : customField
              )
            };
          }
        );
      } catch (error) {
        console.error("Error in optimistic update:", error);
      }
      
      // Also update the card data in cache if it exists
      try {
        updateCardInCache(queryClient, cardId, customFieldId, stringValue);
      } catch (error) {
        console.error("Error updating card cache:", error);
      }
      
      return { previousCustomFields };
    },
    onError: (err, variables, context) => {
      console.error("Error updating custom field:", err);
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["cardCustomField", variables.cardId], 
          context.previousCustomFields
        );
      }
    },
    onSuccess: (data, variables) => {
      console.log("Successfully updated custom field:", variables);
    },
    onSettled: (data, error, variables) => {
      console.log("Update custom field settled, invalidating queries");
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
      console.log("API - Deleting custom field:", { customFieldId, cardId });
      // Make sure all parameters are defined before making the request
      if (!cardId || !customFieldId) {
        console.error("Missing required parameters:", { cardId, customFieldId });
        return Promise.reject(new Error("Missing required parameters"));
      }
      
      return api.delete(`/card/${cardId}/custom-field/${customFieldId}`);
    },
    onMutate: async({ customFieldId, cardId }) => {
      console.log("Optimistically deleting custom field:", { customFieldId, cardId });
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cardCustomField", cardId] });
      
      // Snapshot previous value
      const previousCustomFields = queryClient.getQueryData(["cardCustomField", cardId]);
      
      try {
        // Update the UI optimistically
        queryClient.setQueryData(
          ["cardCustomField", cardId],
          (old: ApiResponse<CardCustomField[]> | undefined) => {
            if (!old) return { data: [] };
            
            const oldData = old.data || [];
            // Make sure old.data is an array
            const safeOldData = Array.isArray(oldData) ? oldData : [];
            
            return {
              ...old,
              data: safeOldData.filter(customField => 
                customField.customFieldId !== customFieldId
              )
            };
          }
        );
      } catch (error) {
        console.error("Error in optimistic update:", error);
      }
      
      // Also update the card data in cache if it exists
      try {
        updateCardInCache(queryClient, cardId, customFieldId, null, true);
      } catch (error) {
        console.error("Error updating card cache:", error);
      }
      
      return { previousCustomFields };
    },
    onError: (err, variables, context) => {
      console.error("Error deleting custom field:", err);
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["cardCustomField", variables.cardId], 
          context.previousCustomFields
        );
      }
    },
    onSuccess: (data, variables) => {
      console.log("Successfully deleted custom field:", variables);
    },
    onSettled: (data, error, variables) => {
      console.log("Delete custom field settled, invalidating queries");
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
    try {
      // Update card data in the cards cache
      queryClient.setQueriesData(
        { queryKey: ["cards"] },
        (old: any) => {
          if (!old || !old.data) return old;
          
          const oldData = old.data || [];
          // Ensure old.data is an array before mapping
          const safeData = Array.isArray(oldData) ? oldData : [];
          
          return {
            ...old,
            data: safeData.map((card: any) => {
              if (card.id === cardId) {
                // Deep clone to avoid mutation
                const updatedCard = { ...card };
                
                // Initialize customFields array if it doesn't exist
                if (!updatedCard.customFields) {
                  updatedCard.customFields = [];
                }
                
                const cardCustomFields = updatedCard.customFields || [];
                // Ensure customFields is an array
                const safeCustomFields = Array.isArray(cardCustomFields) ? cardCustomFields : [];
                
                if (isDelete) {
                  // Remove the custom field
                  updatedCard.customFields = safeCustomFields.filter(
                    (cf: any) => cf.customFieldId !== customFieldId
                  );
                } else {
                  // Find if the custom field already exists
                  const existingIndex = safeCustomFields.findIndex(
                    (cf: any) => cf.customFieldId === customFieldId
                  );
                  
                  if (existingIndex >= 0) {
                    // Update existing field
                    const updatedFields = [...safeCustomFields];
                    updatedFields[existingIndex] = {
                      ...updatedFields[existingIndex],
                      value
                    };
                    updatedCard.customFields = updatedFields;
                  } else {
                    // Add new field
                    updatedCard.customFields = [
                      ...safeCustomFields,
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
          
          const oldData = old.data || [];
          // Ensure old.data is an array before mapping
          const safeData = Array.isArray(oldData) ? oldData : [];
          
          return {
            ...old,
            data: safeData.map((list: any) => {
              if (!list.cards) return list;
              
              const listCards = list.cards || [];
              // Ensure list.cards is an array
              const safeCards = Array.isArray(listCards) ? listCards : [];
              
              return {
                ...list,
                cards: safeCards.map((card: any) => {
                  if (card.id === cardId) {
                    // Deep clone to avoid mutation
                    const updatedCard = { ...card };
                    
                    // Initialize customFields array if it doesn't exist
                    if (!updatedCard.customFields) {
                      updatedCard.customFields = [];
                    }
                    
                    const cardCustomFields = updatedCard.customFields || [];
                    // Ensure customFields is an array
                    const safeCustomFields = Array.isArray(cardCustomFields) ? cardCustomFields : [];
                    
                    if (isDelete) {
                      // Remove the custom field
                      updatedCard.customFields = safeCustomFields.filter(
                        (cf: any) => cf.customFieldId !== customFieldId
                      );
                    } else {
                      // Find if the custom field already exists
                      const existingIndex = safeCustomFields.findIndex(
                        (cf: any) => cf.customFieldId === customFieldId
                      );
                      
                      if (existingIndex >= 0) {
                        // Update existing field
                        const updatedFields = [...safeCustomFields];
                        updatedFields[existingIndex] = {
                          ...updatedFields[existingIndex],
                          value
                        };
                        updatedCard.customFields = updatedFields;
                      } else {
                        // Add new field
                        updatedCard.customFields = [
                          ...safeCustomFields,
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
    } catch (error) {
      console.error("Error in updateCardInCache:", error);
    }
  }

  // For debugging and testing
  const directUpdateField = (customFieldId: string, value: string) => {
    console.log("Making direct update with:", { customFieldId, value, cardId });
    return api.put(`/card/${cardId}/custom-field/${customFieldId}`, { value });
  };

  return {
    cardCustomFields: cardCustomFieldQuery.data?.data || [],
    isLoading: cardCustomFieldQuery.isLoading,
    isError: cardCustomFieldQuery.isError,
    error: cardCustomFieldQuery.error,
    addCustomField: addCustomFieldMutation.mutate,
    updateCustomField: updateCustomFieldMutation.mutate,
    deleteCustomField: deleteCustomFieldMutation.mutate,
    directUpdateField, // Direct update function for testing
    isAddingCustomField: addCustomFieldMutation.isPending,
    isUpdatingCustomField: updateCustomFieldMutation.isPending,
    isDeletingCustomField: deleteCustomFieldMutation.isPending,
  };
};