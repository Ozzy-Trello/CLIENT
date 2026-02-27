import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAccessories,
  createAccessory,
  updateAccessory,
  deleteAccessory,
  Accessory,
  AccessoryCreateRequest,
  AccessoryUpdateRequest,
} from "@api/accessory";

export const useAccessories = (productId?: string) => {
  const { data, isLoading, error } = useQuery<Accessory[]>({
    queryKey: ["accessories", productId],
    queryFn: async () => {
      const response = await getAccessories(1, 100, productId);
      return response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return { accessories: data ?? [], isLoading, error };
};

export const useCreateAccessory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AccessoryCreateRequest) => createAccessory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessories"] });
    },
  });
};

export const useUpdateAccessory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccessoryUpdateRequest }) =>
      updateAccessory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessories"] });
    },
  });
};

export const useDeleteAccessory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccessory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessories"] });
    },
  });
};
