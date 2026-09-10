import {
  deleteCardShipment,
  getCardShipment,
  getEkspedisiCourierMappings,
  saveCardShipment,
  SaveCardShipmentPayload,
} from "@api/card_shipment";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCardShipment = (
  cardId?: string,
  workspaceId?: string,
  options?: { enabled?: boolean },
) => {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;
  const shipmentQuery = useQuery({
    queryKey: ["cardShipment", cardId],
    queryFn: () => getCardShipment(cardId!),
    enabled: !!cardId && enabled,
    // Ekspedisi bisa berubah dari kartu atau orang lain, jadi modal resi
    // selalu mulai dari data server, bukan cache dari sesi sebelumnya.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cardShipment", cardId] }),
      queryClient.invalidateQueries({
        queryKey: ["cardCustomField", cardId, workspaceId],
      }),
      queryClient.invalidateQueries({ queryKey: ["customFields", workspaceId] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: SaveCardShipmentPayload) =>
      saveCardShipment(cardId!, payload),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCardShipment(cardId!),
    onSuccess: refresh,
  });

  return {
    shipment: shipmentQuery.data?.data ?? null,
    isLoading: shipmentQuery.isLoading,
    saveShipment: saveMutation.mutateAsync,
    deleteShipment: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useEkspedisiCourierMappings = (options?: { enabled?: boolean }) => {
  const mappingQuery = useQuery({
    queryKey: ["ekspedisiCourierMapping"],
    queryFn: getEkspedisiCourierMappings,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 60 * 1000,
  });

  return {
    mappings: mappingQuery.data?.data ?? [],
    isLoading: mappingQuery.isLoading,
    isUnavailable: mappingQuery.isError,
  };
};
