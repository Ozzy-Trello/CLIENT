import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createLabel, getLabels, getLabel } from "../api/label";
import { ApiResponse } from "@myTypes/type";
import { User } from "@dto/types";
import { Label } from "@myTypes/label";

export function useLabels() {
  const queryClient = useQueryClient();
 
  // query for all labels
  const labelsQuery = useQuery({
    queryKey: ["labels"],
    queryFn: () => getLabels(),
  });

  // Query for a specific label
  const useLabelQuery = (labelId: string) => {
    return useQuery({
      queryKey: ["label", labelId],
      queryFn: () => getLabel(labelId),
      enabled: !!labelId,
    });
  };

  // Create label mutation with optimistic update
  const createMutation = useMutation({
    mutationFn: (label: Label) => createLabel(label),
    onMutate: async (newLabel) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["labels"] });

      // Snapshot the previous value
      const previousLabels = queryClient.getQueryData<ApiResponse<User[]>>(
        ["labels"]
      );

      // Optimistically update to the new value
      if (previousLabels?.data) {
        const optimisticLabel: User = {
          ...newLabel,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as User;

        queryClient.setQueryData<ApiResponse<User[]>>(
          ["labels"],
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
          ["labels"],
          context.previousLabels
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  return {
    // Query data and state
    labels: labelsQuery.data?.data || [],
    isLoading: labelsQuery.isLoading,
    isError: labelsQuery.isError,
    error: labelsQuery.error,
    
    // Individual label query hook
    useLabelQuery,
    
    // Mutations
    createLabel: createMutation.mutate,
    
    // Mutation states
    isCreating: createMutation.isPending,
    
    // Async versions
    createLabelAsync: createMutation.mutateAsync,
  };
}