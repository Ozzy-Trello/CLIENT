import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createLabel, getLabels, getLabel, updateLabel, deleteLabel } from "../api/label";
import { ApiResponse } from "@myTypes/type";
import { User } from "@dto/types";
import { CardLabel, Label } from "@myTypes/label";

export function useLabels(worksapceId: string, params: CardLabel) {
  const queryClient = useQueryClient();
 
  // query for all labels
  const labelsQuery = useQuery({
    queryKey: ["labels", worksapceId, params.cardId],
    queryFn: () => getLabels(worksapceId, params),
  });

  // Query for a specific label
  const useLabelQuery = (labelId: string) => {
    return useQuery({
      queryKey: ["label", worksapceId, labelId],
      queryFn: () => getLabel(labelId),
      enabled: !!labelId,
    });
  };

  // Create label mutation with optimistic update
  const createMutation = useMutation({
    mutationFn: (label: Label) => createLabel(label),
    onMutate: async (newLabel) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["labels", worksapceId, params.cardId] });
      
      // Snapshot the previous value
      const previousLabels = queryClient.getQueryData<ApiResponse<User[]>>(
        ["labels", worksapceId, params.cardId]
      );
      
      // Optimistically update to the new value
      if (previousLabels?.data) {
        const optimisticLabel: User = {
          ...newLabel,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as User;
        
        queryClient.setQueryData<ApiResponse<User[]>>(
          ["labels", worksapceId, params.cardId],
          {
            ...previousLabels,
            data: [...previousLabels.data, optimisticLabel]
          }
        );
      }
      
      return { previousLabels };
    },
    onError: (err, newLabel, context) => {
      if (context?.previousLabels) {
        queryClient.setQueryData(
          ["labels", worksapceId, params.cardId],
          context.previousLabels
        );
      }
    },
    onSuccess: (data) => {
      // Update with the actual server response
      if (data?.data) {
        queryClient.setQueryData<ApiResponse<User[]>>(
          ["labels", worksapceId, params.cardId],
          data
        );
        queryClient.invalidateQueries({ queryKey: ["cardLabels", worksapceId, params.cardId] });
      }
    },
  });

  // Update label mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: ({ labelId, label }: { labelId: string; label: Label }) => 
    updateLabel(labelId, label),
    onMutate: async ({ labelId, label }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["labels", worksapceId, params.cardId] });
      await queryClient.cancelQueries({ queryKey: ["label", worksapceId, labelId] });
      
      // Snapshot the previous values
      const previousLabels = queryClient.getQueryData<ApiResponse<User[]>>(
        ["labels", worksapceId, params.cardId]
      );
      const previousLabel = queryClient.getQueryData<ApiResponse<User>>(
        ["label", worksapceId, labelId]
      );
      
      // Optimistically update the labels list
      if (previousLabels?.data) {
        const updatedLabels = previousLabels.data.map((existingLabel) => {
          if (existingLabel.id === labelId) {
            return {
              ...existingLabel,
              ...label,
              updatedAt: new Date().toISOString(),
            };
          }
          return existingLabel;
        });
        
        queryClient.setQueryData<ApiResponse<User[]>>(
          ["labels", worksapceId, params.cardId],
          {
            ...previousLabels,
            data: updatedLabels
          }
        );
      }
      
      // Optimistically update the individual label query
      if (previousLabel?.data) {
        queryClient.setQueryData<ApiResponse<any>>(
          ["label", worksapceId, labelId],
          {
            ...previousLabel,
            data: {
              ...previousLabel.data,
              ...label,
              updatedAt: new Date().toISOString(),
            }
          }
        );
      }
      
      return { previousLabels, previousLabel };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousLabels) {
        queryClient.setQueryData(
          ["labels", worksapceId, params.cardId],
          context.previousLabels
        );
      }
      if (context?.previousLabel) {
        queryClient.setQueryData(
          ["label", worksapceId, variables.labelId],
          context.previousLabel
        );
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch the latest data since the API returns ApiResponse<any>
      queryClient.invalidateQueries({ queryKey: ["labels", worksapceId, params.cardId] });
      queryClient.invalidateQueries({ queryKey: ["cardLabels", worksapceId, params.cardId] });
    },
  });

  // Delete label mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: (labelId: string) => deleteLabel(labelId),
    onMutate: async (labelId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["labels", worksapceId,params.cardId] });
      await queryClient.cancelQueries({ queryKey: ["label", worksapceId, labelId] });
      
      // Snapshot the previous values
      const previousLabels = queryClient.getQueryData<ApiResponse<User[]>>(
        ["labels", worksapceId, params.cardId]
      );
      const previousLabel = queryClient.getQueryData<ApiResponse<User>>(
        ["label", worksapceId, worksapceId, labelId]
      );
      
      // Optimistically remove from the labels list
      if (previousLabels?.data) {
        const filteredLabels = previousLabels.data.filter(
          (label) => label.id !== labelId
        );
        
        queryClient.setQueryData<ApiResponse<User[]>>(
          ["labels", worksapceId, params.cardId],
          {
            ...previousLabels,
            data: filteredLabels
          }
        );
      }
      
      // Remove the individual label from cache
      queryClient.removeQueries({ queryKey: ["label", worksapceId, labelId] });
      
      return { previousLabels, previousLabel, labelId };
    },
    onError: (err, labelId, context) => {
      // Rollback on error
      if (context?.previousLabels) {
        queryClient.setQueryData(
          ["labels", worksapceId, params.cardId],
          context.previousLabels
        );
      }
      if (context?.previousLabel) {
        queryClient.setQueryData(
          ["label", worksapceId, labelId],
          context.previousLabel
        );
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch the latest data since the API returns ApiResponse<any>
      queryClient.invalidateQueries({ queryKey: ["labels", worksapceId, params.cardId] });
      queryClient.invalidateQueries({ queryKey: ["cardLabels", worksapceId, params.cardId] });
    },
  });

  // Helper functions
  const createLabelFn = (label: Label) => {
    createMutation.mutate(label);
  };

  const updateLabelFn = (labelId: string, label: Label) => {
    updateMutation.mutate({ labelId, label });
  };

  const deleteLabelFn = (labelId: string) => {
    deleteMutation.mutate(labelId);
  };

  // Helper function to check if a label exists
  const hasLabel = (labelId: string): boolean => {
    return !!getLabel(labelId);
  };

  return {
    // Query data and state
    labels: labelsQuery.data?.data || [],
    isLoading: labelsQuery.isLoading,
    isError: labelsQuery.isError,
    error: labelsQuery.error,
   
    // Individual label query hook
    useLabelQuery,
   
    // Label operations
    createLabel: createLabelFn,
    updateLabel: updateLabelFn,
    deleteLabel: deleteLabelFn,
   
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    
    // Error states
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
   
    // Helper functions
    getLabel,
    hasLabel,
   
    // Async versions
    createLabelAsync: createMutation.mutateAsync,
    updateLabelAsync: updateMutation.mutateAsync,
    deleteLabelAsync: deleteMutation.mutateAsync,

    // Raw mutations for advanced usage
    createMutation: createMutation.mutate,
    updateMutation: updateMutation.mutate,
    deleteMutation: deleteMutation.mutate,

    // For debugging
    refetch: labelsQuery.refetch,
  };
}
