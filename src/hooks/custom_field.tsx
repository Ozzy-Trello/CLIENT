import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { customFields, createCustomField, updateCustomField, deleteCustomField, reorderCustomFields as apiReorderCustomFields } from "../api/custom_field";
import { ApiResponse } from "../types/type";
import { CustomField } from "@myTypes/custom-field";
import { useCardDetailContext } from "@providers/card-detail-context";


export function useCustomFields(workspaceId: string) {
  const queryClient = useQueryClient();
  // The main query for custom fields
  const customFieldQuery = useQuery({
    queryKey: ["customFields", workspaceId],
    queryFn: () => customFields(workspaceId),
    enabled: !!workspaceId,
  });

  const invalidateSpecificCardCustomFields = (cardId?: string) => {
    if (cardId) {
      console.log("invalidating card cc nih: card: "+cardId);
      queryClient.invalidateQueries({
        queryKey: ["cardCustomField", cardId, workspaceId]
      });
    }
  };

  // Create custom field mutation with optimistic update
  const createMutation = useMutation({
    mutationFn: (customField: Partial<CustomField>) => 
    createCustomField(customField, workspaceId),
    onMutate: async (newCustomField) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["customFields", workspaceId] });

      // Snapshot the previous value
      const previousCustomFields = queryClient.getQueryData<ApiResponse<CustomField[]>>(
        ["customFields", workspaceId]
      );

      // Optimistically update to the new value
      if (previousCustomFields?.data) {
        const optimisticCustomField: CustomField = {
          id: `temp-${Date.now()}`, // Temporary ID
          ...newCustomField,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as CustomField;

        queryClient.setQueryData<ApiResponse<CustomField[]>>(
          ["customFields", workspaceId],
          {
            ...previousCustomFields,
            data: [...previousCustomFields.data, optimisticCustomField]
          }
        );
      }

      // Return a context object with the snapshotted value
      return { previousCustomFields };
    },
    onError: (err, newCustomField, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["customFields", workspaceId],
          context.previousCustomFields
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["customFields", workspaceId] });
    },
  });

  // Update custom field mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CustomField> }) =>
    updateCustomField(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["customFields", workspaceId] });

      const previousCustomFields = queryClient.getQueryData<ApiResponse<CustomField[]>>(
        ["customFields", workspaceId]
      );

      if (previousCustomFields?.data) {
        const updatedData = previousCustomFields.data.map(field =>
          field.id === id 
            ? { ...field, ...updates, updatedAt: new Date().toISOString() }
            : field
        );

        queryClient.setQueryData<ApiResponse<CustomField[]>>(
          ["customFields", workspaceId],
          {
            ...previousCustomFields,
            data: updatedData
          }
        );
      }

      return { previousCustomFields };
    },
    onError: (err, variables, context) => {
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["customFields", workspaceId],
          context.previousCustomFields
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customFields", workspaceId] });
    },
  });

  // Delete custom field mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: (customFieldId: string) => deleteCustomField(customFieldId),
    onMutate: async (customFieldId) => {
      await queryClient.cancelQueries({ queryKey: ["customFields", workspaceId] });

      const previousCustomFields = queryClient.getQueryData<ApiResponse<CustomField[]>>(
        ["customFields", workspaceId]
      );

      if (previousCustomFields?.data) {
        const filteredData = previousCustomFields.data.filter(
          field => field.id !== customFieldId
        );

        queryClient.setQueryData<ApiResponse<CustomField[]>>(
          ["customFields", workspaceId],
          {
            ...previousCustomFields,
            data: filteredData
          }
        );
      }

      return { previousCustomFields };
    },
    onError: (err, customFieldId, context) => {
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["customFields", workspaceId],
          context.previousCustomFields
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customFields", workspaceId] });
    },
  });

  // Reorder custom fields mutation with optimistic update
  const reorderMutation = useMutation({
    mutationFn: (params: { customFieldId: string; targetPosition: number; positionType?: 'top' | 'bottom' }) => 
      apiReorderCustomFields(workspaceId, params.customFieldId, params.targetPosition, params.positionType),
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["customFields", workspaceId] });

      const previousCustomFields = queryClient.getQueryData<ApiResponse<CustomField[]>>(
        ["customFields", workspaceId]
      );

      if (previousCustomFields?.data) {
        // Find the custom field being moved
        const movedFieldIndex = previousCustomFields.data.findIndex(field => field.id === params.customFieldId);
        if (movedFieldIndex === -1) return { previousCustomFields };
        
        const movedField = previousCustomFields.data[movedFieldIndex];
        const newData = [...previousCustomFields.data];
        
        // Remove the moved field from its original position
        newData.splice(movedFieldIndex, 1);
        
        // Calculate the new index based on target position and position type
        let newIndex = params.targetPosition;
        if (params.positionType === 'top' && newIndex > 0) {
          newIndex = newIndex - 1; // Adjust for 0-based index when moving to top
        } else if (params.positionType === 'bottom') {
          newIndex = newIndex + 1; // Insert after the target when moving to bottom
        }
        
        // Insert the moved field at the new position
        newData.splice(newIndex, 0, movedField);
        
        // Update the order property based on the new position
        const reorderedData = newData.map((field, index) => ({
          ...field,
          order: index * 10000 // Use the same large gap as backend
        }));

        queryClient.setQueryData<ApiResponse<CustomField[]>>(
          ["customFields", workspaceId],
          {
            ...previousCustomFields,
            data: reorderedData
          }
        );
      }

      return { previousCustomFields };
    },
    onError: (err, params, context) => {
      if (context?.previousCustomFields) {
        queryClient.setQueryData(
          ["customFields", workspaceId],
          context.previousCustomFields
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customFields", workspaceId] });
    },
  });

  // Helper function to reorder items (useful for drag and drop)
  const reorderCustomFields = (startIndex: number, endIndex: number) => {
    const fields = [...(customFieldQuery.data?.data || [])];
    if (startIndex === endIndex) return;
    
    const fieldId = fields[startIndex]?.id;
    if (!fieldId) return;
    
    // Determine position type (top/bottom) based on movement direction
    const positionType = endIndex === 0 ? 'top' : 
                        endIndex >= fields.length - 1 ? 'bottom' : undefined;
    
    reorderMutation.mutate({
      customFieldId: fieldId,
      targetPosition: endIndex,
      positionType
    });
  };

  // Helper function to move a field to a specific position
  const moveCustomFieldToPosition = (fieldId: string, newPosition: number) => {
    const fields = [...(customFieldQuery.data?.data || [])];
    const currentIndex = fields.findIndex(field => field.id === fieldId);
    
    if (currentIndex === -1 || currentIndex === newPosition) return;
    
    // Determine position type (top/bottom) based on target position
    const positionType = newPosition === 0 ? 'top' : 
                        newPosition >= fields.length - 1 ? 'bottom' : undefined;
    
    reorderMutation.mutate({
      customFieldId: fieldId,
      targetPosition: newPosition,
      positionType
    });
  };

  return {
    // Query data and state
    customFields: customFieldQuery.data?.data || [],
    isLoading: customFieldQuery.isLoading,
    isError: customFieldQuery.isError,
    error: customFieldQuery.error,
    invalidateSpecificCardCustomFields,
    
    // Mutations
    createCustomField: createMutation.mutate,
    updateCustomField: updateMutation.mutate,
    deleteCustomField: deleteMutation.mutate,
    reorderCustomFields,
    moveCustomFieldToPosition,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
    
    // Async versions for when you need promises
    createCustomFieldAsync: createMutation.mutateAsync,
    updateCustomFieldAsync: updateMutation.mutateAsync,
    deleteCustomFieldAsync: deleteMutation.mutateAsync,
    reorderCustomFieldsAsync: reorderMutation.mutateAsync,
  };
}