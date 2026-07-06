import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getListNama,
  getListNamaSummary,
  createListNama,
  updateListNama,
  deleteListNama,
  bulkImportListNama,
  ListNama,
  ListNamaCreateRequest,
  ListNamaUpdateRequest,
  ListNamaBulkRequest,
} from "@api/card-list-nama";

export const useListNama = (cardId: string) => {
  const { data, isLoading, refetch } = useQuery<ListNama[]>({
    queryKey: ["card-list-nama", cardId],
    queryFn: async () => {
      const response = await getListNama(cardId);
      return response.data ?? [];
    },
    enabled: !!cardId,
    staleTime: 2 * 60 * 1000,
  });

  return { listNama: data ?? [], isLoading, refetch };
};

export const useListNamaSummary = (cardId: string) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["card-list-nama-summary", cardId],
    queryFn: async () => {
      const response = await getListNamaSummary(cardId);
      return response.data ?? [];
    },
    enabled: !!cardId,
    staleTime: 2 * 60 * 1000,
  });

  return { summary: data ?? [], isLoading, refetch };
};

export const useCreateListNama = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ListNamaCreateRequest) => createListNama(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-list-nama", cardId] });
      queryClient.invalidateQueries({ queryKey: ["card-list-nama-summary", cardId] });
    },
  });
};

export const useBulkImportListNama = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ListNamaBulkRequest) => bulkImportListNama(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-list-nama", cardId] });
      queryClient.invalidateQueries({ queryKey: ["card-list-nama-summary", cardId] });
    },
  });
};

export const useUpdateListNama = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ListNamaUpdateRequest }) =>
      updateListNama(cardId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-list-nama", cardId] });
      queryClient.invalidateQueries({ queryKey: ["card-list-nama-summary", cardId] });
    },
  });
};

export const useDeleteListNama = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteListNama(cardId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-list-nama", cardId] });
      queryClient.invalidateQueries({ queryKey: ["card-list-nama-summary", cardId] });
    },
  });
};
