import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import {
  createLabel,
  updateLabel,
  deleteLabel,
  getLabels,
  getAllLabels,
  getWorkspaceLabels,
  getTopLabels,
} from "@api/label";
import { addCardLabel, removeLabelFromCard, getCardLabels } from "@api/card";
import { Label, CardLabel } from "@myTypes/label";
import { ApiResponse } from "@myTypes/type";
import { useState, useEffect } from "react";

export function useLabels(
  workspaceId: string,
  cardId?: string,
  labelQueryParams?: CardLabel,
  options?: {
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const isGloballyEnabled = options?.enabled ?? true;

  // ---------- Queries ----------

  const labelsQuery = useQuery({
    queryKey: ["labels", workspaceId, labelQueryParams],
    queryFn: () => getLabels(workspaceId, labelQueryParams || {}),
    enabled:
      isGloballyEnabled &&
      !!workspaceId &&
      !!labelQueryParams &&
      Object.values(labelQueryParams).some(
        (v) => v !== "" && v !== null && v !== undefined
      ),
  });

  const allLabelsQuery = useQuery({
    queryKey: ["allLabels", workspaceId],
    queryFn: () => getAllLabels(workspaceId),
    enabled: isGloballyEnabled && !!workspaceId,
  });

  const cardLabelsQuery = useQuery({
    queryKey: ["cardLabels", workspaceId, cardId],
    queryFn: () => {
      if (!cardId) throw new Error("cardId is required to fetch card labels");
      return getCardLabels(workspaceId, cardId);
    },
    enabled: isGloballyEnabled && !!workspaceId && !!cardId,
  });

  // ---------- Mutations ----------
  const createLabelMutation = useMutation({
    mutationFn: (label: Label) => createLabel(label),
    onMutate: async (newLabel) => {
      await queryClient.cancelQueries({ queryKey: ["labels", workspaceId] });

      const previousLabels = queryClient.getQueryData<ApiResponse<Label[]>>([
        "labels",
        workspaceId,
      ]);

      const optimisticLabel = {
        ...newLabel,
        id: `temp-${Date.now()}`,
        isAssigned: false,
      };

      if (previousLabels?.data) {
        queryClient.setQueryData<ApiResponse<Label[]>>(
          ["labels", workspaceId],
          {
            ...previousLabels,
            data: [...previousLabels.data, optimisticLabel],
          }
        );
      }

      return { previousLabels };
    },
    onError: (_, __, context) => {
      if (context?.previousLabels) {
        queryClient.setQueryData(
          ["labels", workspaceId],
          context.previousLabels
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Label> }) =>
      updateLabel(id, updates as Label),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["labels", workspaceId] });

      const previousLabels = queryClient.getQueryData<ApiResponse<CardLabel[]>>(
        ["labels", workspaceId]
      );

      if (previousLabels?.data) {
        const updatedLabels = previousLabels.data.map((label) =>
          label.labelId === id ? { ...label, ...updates } : label
        );
        queryClient.setQueryData<ApiResponse<CardLabel[]>>(
          ["labels", workspaceId],
          {
            ...previousLabels,
            data: updatedLabels,
          }
        );
      }

      return { previousLabels };
    },
    onError: (_, __, context) => {
      if (context?.previousLabels) {
        queryClient.setQueryData(
          ["labels", workspaceId],
          context.previousLabels
        );
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

      const previousLabels = queryClient.getQueryData<ApiResponse<CardLabel[]>>(
        ["labels", workspaceId]
      );

      if (previousLabels?.data) {
        queryClient.setQueryData<ApiResponse<CardLabel[]>>(
          ["labels", workspaceId],
          {
            ...previousLabels,
            data: previousLabels.data.filter((label) => label.labelId !== id),
          }
        );
      }

      return { previousLabels };
    },
    onError: (_, __, context) => {
      if (context?.previousLabels) {
        queryClient.setQueryData(
          ["labels", workspaceId],
          context.previousLabels
        );
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
        const data =
          queryClient.getQueryData<ApiResponse<CardLabel[]>>(queryKey);
        if (data?.data) {
          queryClient.setQueryData(queryKey, {
            ...data,
            data: data.data.map((label) =>
              label.labelId === labelId ? { ...label, isAssigned: true } : label
            ),
          });
        }
      };

      updateIsAssigned(labelKey);
      if (cardId) updateIsAssigned(cardLabelKey);
    },
    onError: () => {
      queryClient.invalidateQueries({
        queryKey: ["labels", workspaceId, labelQueryParams || {}],
      });
      if (cardId)
        queryClient.invalidateQueries({
          queryKey: ["cardLabels", workspaceId, cardId],
        });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["labels", workspaceId, labelQueryParams || {}],
      });
      if (cardId)
        queryClient.invalidateQueries({
          queryKey: ["cardLabels", workspaceId, cardId],
        });
      if (cardId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(cardId),
        });
      }
    },
  });

  const removeCardLabelMutation = useMutation({
    mutationFn: ({ labelId }: { labelId: string }) => {
      if (!cardId)
        throw new Error("cardId is required for removeLabelFromCard");
      return removeLabelFromCard(labelId, cardId);
    },
    onMutate: async ({ labelId }) => {
      await queryClient.cancelQueries();

      const updateIsAssigned = (queryKey: any) => {
        const data =
          queryClient.getQueryData<ApiResponse<CardLabel[]>>(queryKey);
        if (data?.data) {
          queryClient.setQueryData(queryKey, {
            ...data,
            data: data.data.map((label) =>
              label.labelId === labelId
                ? { ...label, isAssigned: false }
                : label
            ),
          });
        }
      };

      updateIsAssigned(["labels", workspaceId]);
      if (cardId) updateIsAssigned(["cardLabels", workspaceId, cardId]);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
      if (cardId)
        queryClient.invalidateQueries({
          queryKey: ["cardLabels", workspaceId, cardId],
        });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", workspaceId] });
      if (cardId)
        queryClient.invalidateQueries({
          queryKey: ["cardLabels", workspaceId, cardId],
        });
      if (cardId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(cardId),
        });
      }
    },
  });

  return {
    // Queries
    labels: labelsQuery.data?.data || [],
    cardLabels: cardLabelsQuery.data?.data || [],
    allLabels: (allLabelsQuery.data?.data || []).map((label: any) => ({
      id: label.id,
      labelId: label.id, // Map id to labelId for CardLabel interface
      name: label.name,
      value: label.value,
      valueType: label.valueType || label.value_type,
      workspaceId: label.workspaceId || label.workspace_id,
      createdAt: label.createdAt || label.created_at,
      updatedAt: label.updatedAt || label.updated_at,
    })),
    // isLoadingLabels: labelsQuery.isLoading,
    isLoadingCardLabels: cardLabelsQuery.isLoading,
    isLoadingAllLabels: allLabelsQuery.isLoading,

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

export function usePaginatedLabels(
  workspaceId: string,
  labelQueryParams?: CardLabel,
  cardId?: string
) {
  const [page, setPage] = useState(1);
  const [labels, setLabels] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;
  const queryClient = useQueryClient();

  const { isFetching } = useQuery({
    queryKey: ["labels", workspaceId, labelQueryParams, page],
    queryFn: async () => {
      const params = { ...labelQueryParams, page, limit };
      const res = await getLabels(workspaceId, params as any);
      const newData = res.data ?? [];
      setLabels((prev) => (page === 1 ? newData : [...prev, ...newData]));
      setHasMore(newData.length === limit);
      return newData;
    },
    enabled: !!workspaceId,
  });

  const addCardLabelMutation = useMutation({
    mutationFn: ({ labelId, cardId }: { labelId: string; cardId: string }) => {
      return addCardLabel(workspaceId, labelId, cardId);
    },
    onMutate: async ({ labelId, cardId }) => {
      await queryClient.cancelQueries();

      const labelKey = ["labels", workspaceId, labelQueryParams, page];
      const cardLabelKey = ["cardLabels", workspaceId, cardId];

      const updateIsAssigned = (queryKey: any) => {
        const data =
          queryClient.getQueryData<ApiResponse<CardLabel[]>>(queryKey);
        if (data?.data) {
          queryClient.setQueryData(queryKey, {
            ...data,
            data: data.data.map((label) =>
              label.labelId === labelId ? { ...label, isAssigned: true } : label
            ),
          });
        }
      };

      updateIsAssigned(labelKey);
      updateIsAssigned(cardLabelKey);
    },
    onError: () => {
      queryClient.invalidateQueries({
        queryKey: ["labels", workspaceId, labelQueryParams, page],
      });
      queryClient.invalidateQueries({
        queryKey: ["cardLabels", workspaceId, cardId],
      });
    },
    onSettled: () => {
      // Invalidate both paginated labels and card labels queries
      reset();
      queryClient.invalidateQueries({
        queryKey: ["labels", workspaceId, labelQueryParams, page],
      });
      queryClient.invalidateQueries({
        queryKey: ["cardLabels", workspaceId, cardId],
      });
    },
  });

  const removeCardLabelMutation = useMutation({
    mutationFn: ({ labelId, cardId }: { labelId: string; cardId: string }) => {
      return removeLabelFromCard(labelId, cardId);
    },
    onMutate: async ({ labelId, cardId }) => {
      await queryClient.cancelQueries();

      const labelKey = ["labels", workspaceId, labelQueryParams, page];
      const cardLabelKey = ["cardLabels", workspaceId, cardId];

      const updateIsAssigned = (queryKey: any) => {
        const data =
          queryClient.getQueryData<ApiResponse<CardLabel[]>>(queryKey);
        if (data?.data) {
          queryClient.setQueryData(queryKey, {
            ...data,
            data: data.data.map((label) =>
              label.labelId === labelId
                ? { ...label, isAssigned: false }
                : label
            ),
          });
        }
      };

      updateIsAssigned(labelKey);
      updateIsAssigned(cardLabelKey);
    },
    onError: () => {
      queryClient.invalidateQueries({
        queryKey: ["labels", workspaceId, labelQueryParams, page],
      });
      queryClient.invalidateQueries({
        queryKey: ["cardLabels", workspaceId, cardId],
      });
    },
    onSettled: () => {
      // Invalidate both paginated labels and card labels queries
      reset();
      queryClient.invalidateQueries({
        queryKey: ["labels", workspaceId, labelQueryParams, page],
      });
      queryClient.invalidateQueries({
        queryKey: ["cardLabels", workspaceId, cardId],
      });
    },
  });

  const loadMore = () => setPage((p) => p + 1);
  const reset = () => {
    setPage(1);
    setLabels([]);
    setHasMore(true);
  };

  return {
    labels,
    isFetching,
    hasMore,
    loadMore,
    reset,
    addCardLabel: (args: { labelId: string }) => {
      if (!cardId) throw new Error("cardId is required for addCardLabel");
      addCardLabelMutation.mutate({ ...args, cardId });
    },
    removeCardLabel: (args: { labelId: string }) => {
      if (!cardId) throw new Error("cardId is required for removeCardLabel");
      removeCardLabelMutation.mutate({ ...args, cardId });
    },
  };
}

export function useWorkspaceLabels(
  workspaceId: string,
  search?: string,
  options?: { enabled?: boolean }
) {
  const [page, setPage] = useState(1);
  const [labels, setLabels] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const limit = 10;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination when search changes
  useEffect(() => {
    setPage(1);
    setLabels([]);
    setHasMore(true);
  }, [search]);

  const { isFetching, refetch } = useQuery({
    queryKey: ["workspaceLabels", workspaceId, page, debouncedSearch],
    queryFn: async () => {
      const res = await getWorkspaceLabels(
        workspaceId,
        page,
        limit,
        debouncedSearch
      );
      const newData = res.data ?? [];

      // Transform LabelAttributes to CardLabel format
      const transformedData = newData.map((label: any) => ({
        labelId: label.id,
        name: label.name,
        value: label.value,
        valueType: label.value_type || label.valueType,
        workspaceId: label.workspace_id || label.workspaceId,
        createdAt: label.created_at || label.createdAt,
        updatedAt: label.updated_at || label.updatedAt,
        isAssigned: false, // Default value for workspace labels
      }));

      setLabels((prev) =>
        page === 1 ? transformedData : [...prev, ...transformedData]
      );
      setHasMore(transformedData.length === limit);

      // Set total count from pagination info if available
      if (res.paginate) {
        setTotalCount(res.paginate.totalData || 0);
      }

      return transformedData;
    },
    enabled: !!workspaceId && (options?.enabled ?? true),
  });

  const loadMore = () => setPage((p) => p + 1);

  const reset = () => {
    setPage(1);
    setLabels([]);
    setHasMore(true);
    setTotalCount(0);
  };

  return {
    labels,
    isFetching,
    hasMore,
    totalCount,
    loadMore,
    reset,
    refetch,
  };
}

export function useTopWorkspaceLabels(
  workspaceId: string,
  limit: number = 2,
  options?: { enabled?: boolean }
) {
  const { data, isFetching, error } = useQuery({
    queryKey: ["workspaceTopLabels", workspaceId, limit],
    queryFn: async () => {
      const res = await getTopLabels(workspaceId, limit);
      const top = res.data ?? [];

      return top.map((label: any) => ({
        id: label.id,
        labelId: label.id,
        name: label.name,
        value: label.value,
        valueType: label.value_type || label.valueType,
        workspaceId: label.workspace_id || label.workspaceId,
        usageCount: label.usage_count ?? label.usageCount ?? 0,
        createdAt: label.created_at || label.createdAt,
        updatedAt: label.updated_at || label.updatedAt,
        isAssigned: false,
      }));
    },
    enabled: !!workspaceId && (options?.enabled ?? true),
  });

  return {
    topLabels: data || [],
    isFetching,
    error,
  };
}
