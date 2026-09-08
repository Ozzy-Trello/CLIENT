import {
  deleteCardShipment,
  getCardShipment,
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
