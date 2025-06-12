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
    mutationFn: (reorderedIds: string[]) => apiReorderCustomFields(workspaceId, reorderedIds),
    onMutate: async (reorderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["customFields", workspaceId] });

      const previousCustomFields = queryClient.getQueryData<ApiResponse<CustomField[]>>(
        ["customFields", workspaceId]
      );

      if (previousCustomFields?.data) {
        // Create a map for quick lookup
        const fieldMap = new Map(
          previousCustomFields.data.map(field => [field.id, field])
        );

        // Reorder the fields based on the new order
        const reorderedData = reorderedIds
          .map(id => fieldMap.get(id))
          .filter((field): field is CustomField => field !== undefined);

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
    onError: (err, reorderedIds, context) => {
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
    const [removed] = fields.splice(startIndex, 1);
    fields.splice(endIndex, 0, removed);
    
    const reorderedIds = fields.map(field => field.id);
    reorderMutation.mutate(reorderedIds);
  };

  // Helper function to move a field to a specific position
  const moveCustomFieldToPosition = (fieldId: string, newPosition: number) => {
    const fields = [...(customFieldQuery.data?.data || [])];
    const currentIndex = fields.findIndex(field => field.id === fieldId);
    
    if (currentIndex === -1) return;
    
    const [removed] = fields.splice(currentIndex, 1);
    fields.splice(newPosition, 0, removed);
    
    const reorderedIds = fields.map(field => field.id);
    reorderMutation.mutate(reorderedIds);
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