import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLabel,
  updateLabel,
  deleteLabel,
  getLabels,
} from "@api/label";
import {   
  addCardLabel,
  removeLabelFromCard,
  getCardLabels } from "@api/card";
import { Label, CardLabel } from "@myTypes/label";
import { ApiResponse } from "@myTypes/type";

export function useLabels(workspaceId: string, cardId?: string, labelQueryParams?: CardLabel) {
  const queryClient = useQueryClient();

  // ---------- Queries ----------

  const labelsQuery = useQuery({
    queryKey: ["labels", workspaceId, labelQueryParams],
    queryFn: () => getLabels(workspaceId, labelQueryParams || {}),
    enabled: !!workspaceId,
  });

  const cardLabelsQuery = useQuery({
    queryKey: ["cardLabels", workspaceId, cardId],
    queryFn: () => {
      if (!cardId) throw new Error("cardId is required to fetch card labels");
      return getCardLabels(workspaceId, cardId);
    },
    enabled: !!workspaceId && !!cardId,
  });

  // ---------- Mutations ----------
  const createLabelMutation = useMutation({
    mutationFn: (label: Label) => createLabel(label),
    onMutate: async (newLabel) => {
      await queryClient.cancelQueries({ queryKey: ["labels", workspaceId] });

      const previousLabels = queryClient.getQueryData<ApiResponse<Label[]>>(["labels", workspaceId]);

      const optimisticLabel = {
        ...newLabel,
        id: `temp-${Date.now()}`,
        isAssigned: false,
      };

      if (previousLabels?.data) {
        queryClient.setQueryData<ApiResponse<Label[]>>(["labels", workspaceId], {
          ...previousLabels,
          data: [...previousLabels.data, optimisticLabel],
        });
      }

      return { previousLabels };
    },
    onError: (_, __, context) => {
      if (context?.previousLabels) {
        queryClient.setQueryData(["labels", workspaceId], context.previousLabels);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Label> }) => updateLabel(id, updates as Label),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["labels", workspaceId] });

      const previousLabels = queryClient.getQueryData<ApiResponse<CardLabel[]>>(["labels", workspaceId]);

      if (previousLabels?.data) {
        const updatedLabels = previousLabels.data.map(label =>
          label.labelId === id ? { ...label, ...updates } : label
        );
        queryClient.setQueryData<ApiResponse<CardLabel[]>>(["labels", workspaceId], {
          ...previousLabels,
          data: updatedLabels,
        });
      }

      return { previousLabels };
    },
    onError: (_, __, context) => {
      if (context?.previousLabels) {
        queryClient.setQueryData(["labels", workspaceId], context.previousLabels);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (id: string) => deleteLabel(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["labels", workspaceId] });

      const previousLabels = queryClient.getQueryData<ApiResponse<CardLabel[]>>(["labels", workspaceId]);

      if (previousLabels?.data) {
        queryClient.setQueryData<ApiResponse<CardLabel[]>>(["labels", workspaceId], {
          ...previousLabels,
          data: previousLabels.data.filter(label => label.labelId !== id),
        });
      }

      return { previousLabels };
    },
    onError: (_, __, context) => {
      if (context?.previousLabels) {
        queryClient.setQueryData(["labels", workspaceId], context.previousLabels);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
    },
  });

  const addCardLabelMutation = useMutation({
    mutationFn: ({ labelId }: { labelId: string }) => {
      if (!cardId) throw new Error("cardId is required for addCardLabel");
      return addCardLabel(workspaceId, labelId, cardId);
    },
    onMutate: async ({ labelId }) => {
      await queryClient.cancelQueries();

      const labelKey = ["labels", workspaceId, labelQueryParams || {}];
      const cardLabelKey = ["cardLabels", workspaceId, cardId];

      const updateIsAssigned = (queryKey: any) => {
        const data = queryClient.getQueryData<ApiResponse<CardLabel[]>>(queryKey);
        if (data?.data) {
          queryClient.setQueryData(queryKey, {
            ...data,
            data: data.data.map(label =>
              label.labelId === labelId ? { ...label, isAssigned: true } : label
            ),
          });
        }
      };

      updateIsAssigned(labelKey);
      if (cardId) updateIsAssigned(cardLabelKey);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId, labelQueryParams || {}] });
      if (cardId) queryClient.invalidateQueries({ queryKey: ["cardLabels", workspaceId, cardId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId, labelQueryParams || {}] });
      if (cardId) queryClient.invalidateQueries({ queryKey: ["cardLabels", workspaceId, cardId] });
    },
  });


  const removeCardLabelMutation = useMutation({
    mutationFn: ({ labelId }: { labelId: string }) => {
      if (!cardId) throw new Error("cardId is required for removeLabelFromCard");
      return removeLabelFromCard(labelId, cardId);
    },
    onMutate: async ({ labelId }) => {
      await queryClient.cancelQueries();

      const updateIsAssigned = (queryKey: any) => {
        const data = queryClient.getQueryData<ApiResponse<CardLabel[]>>(queryKey);
        if (data?.data) {
          queryClient.setQueryData(queryKey, {
            ...data,
            data: data.data.map(label =>
              label.labelId === labelId ? { ...label, isAssigned: false } : label
            ),
          });
        }
      };

      updateIsAssigned(["labels", workspaceId]);
      if (cardId) updateIsAssigned(["cardLabels", workspaceId, cardId]);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
      if (cardId) queryClient.invalidateQueries({ queryKey: ["cardLabels", workspaceId, cardId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
      if (cardId) queryClient.invalidateQueries({ queryKey: ["cardLabels", workspaceId, cardId] });
    },
  });

  return {
    // Queries
    labels: labelsQuery.data?.data || [],
    cardLabels: cardLabelsQuery.data?.data || [],
    isLoadingLabels: labelsQuery.isLoading,
    isLoadingCardLabels: cardLabelsQuery.isLoading,

    // Mutations
    createLabel: createLabelMutation.mutate,
    updateLabel: updateLabelMutation.mutate,
    deleteLabel: deleteLabelMutation.mutate,
    addCardLabel: addCardLabelMutation.mutate,
    removeCardLabel: removeCardLabelMutation.mutate,

    // Async (promise-based) variants
    createLabelAsync: createLabelMutation.mutateAsync,
    updateLabelAsync: updateLabelMutation.mutateAsync,
    deleteLabelAsync: deleteLabelMutation.mutateAsync,
    addCardLabelAsync: addCardLabelMutation.mutateAsync,
    removeCardLabelAsync: removeCardLabelMutation.mutateAsync,

    // Mutation loading states
    isCreating: createLabelMutation.isPending,
    isUpdating: updateLabelMutation.isPending,
    isDeleting: deleteLabelMutation.isPending,
    isAssigning: addCardLabelMutation.isPending,
    isUnassigning: removeCardLabelMutation.isPending,
  };
}
