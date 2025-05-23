import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "../api";
import { customFields } from "../api/custom_field";
import { ApiResponse, CustomField } from "../types/type";
import { AnyList } from "../types/list";

export function useCustomFields(workspaceId: string) {
  const queryClient = useQueryClient();
  
  // The main query for custom fields
  const customFieldQuery = useQuery({
    queryKey: ["customFields", workspaceId],
    queryFn: () => customFields(workspaceId),
    enabled: !!workspaceId,
  });

  // Add a new custom field mutation with optimistic updates
  const addCustomFieldMutation = useMutation({
    mutationFn: (newField: Partial<CustomField>) => {
      return api.post("/custom-field", newField, { 
        headers: { 'workspace-id': workspaceId } 
      });
    },
    // This runs before the API call to update the UI immediately
    onMutate: async (newField) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["customFields", workspaceId] });
      
      // Snapshot the previous value
      const previousLists = queryClient.getQueryData(["customFields", workspaceId]);
      
      // Optimistically update the UI
      queryClient.setQueryData(
        ["customFields", workspaceId], 
        (old: ApiResponse<AnyList[]> | undefined) => {
          if (!old) return { data: [newField] };
          return {
            ...old,
            data: [...(old.data ?? []), newField]
          };
        }
      );
      
      // Return context with the snapshotted value
      return { previousLists };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newField, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(["customFields", workspaceId], context.previousLists);
      }
    },
    // Always refetch after error or success:
    onSettled: () => {
      // This will reconcile any differences between our optimistic update and the actual server state
      queryClient.invalidateQueries({ queryKey: ["customFields", workspaceId] });
    },
  });

  // Update a custom field title mutation
  const updateCustomFieldMutation = useMutation({
    mutationFn: ({ customFieldId, workspaceId, updates }: { customFieldId: string, workspaceId: string; updates: Partial<CustomField> }) => {
      return api.put(`/custom-field/${customFieldId}`, updates);
    },
    // This runs before the API call to update the UI immediately
    onMutate: async ({ customFieldId, workspaceId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["customFields", workspaceId] });
      
      const previousCustomField = queryClient.getQueryData(["customFields", workspaceId]);
      
      // Optimistically update the UI
      queryClient.setQueryData(
        ["customFields", workspaceId], 
        (old: ApiResponse<CustomField[]> | undefined) => {
          if (!old) return { data: [] };
          
          return {
            ...old,
            data: (old.data ?? []).map(customField => 
              customField.id === customFieldId ? { ...customField, ...updates } : customField
            )
          };
        }
      );
      
      return { previousCustomField };
    },
    onError: (err, variables, context) => {
      if (context?.previousCustomField) {
        queryClient.setQueryData(["customFields", workspaceId], context.previousCustomField);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["customFields", workspaceId] });
    },
  });


  return {
    customFields: customFieldQuery.data?.data || [],
    pagination: customFieldQuery.data?.paginate,
    isLoading: customFieldQuery.isLoading,
    isError: customFieldQuery.isError,
    error: customFieldQuery.error,
    addCustomField: addCustomFieldMutation.mutate,
    updateCustomField: updateCustomFieldMutation.mutate,
    iasAddingCustomField: addCustomFieldMutation.isPending,
    isUpdatingField: updateCustomFieldMutation.isPending,
  };
}