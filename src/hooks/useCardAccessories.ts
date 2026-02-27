import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCardAccessories,
  createCardAccessory,
  updateCardAccessory,
  deleteCardAccessory,
  CardAccessory,
  CardAccessoryCreateRequest,
  CardAccessoryUpdateRequest,
} from "@api/card-accessory";

export const useCardAccessories = (cardId: string) => {
  const { data, isLoading, refetch } = useQuery<CardAccessory[]>({
    queryKey: ["card-accessories", cardId],
    queryFn: async () => {
      const response = await getCardAccessories(cardId);
      return response.data ?? [];
    },
    enabled: !!cardId,
    staleTime: 2 * 60 * 1000,
  });

  return { cardAccessories: data ?? [], isLoading, refetch };
};

export const useCreateCardAccessory = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CardAccessoryCreateRequest) =>
      createCardAccessory(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-accessories", cardId] });
    },
  });
};

export const useUpdateCardAccessory = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CardAccessoryUpdateRequest }) =>
      updateCardAccessory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-accessories", cardId] });
    },
  });
};

export const useDeleteCardAccessory = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCardAccessory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-accessories", cardId] });
    },
  });
};
