import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cardAcitivities } from "../api/card_activity";

export const useCardActivity = (cardId: string) => {
  const queryClient = useQueryClient();

  const cardActivityQuery = useQuery({
    queryKey: ["cardActivity", cardId],
    queryFn: () => cardAcitivities(cardId),
    enabled: !!cardId,
    staleTime: 5000,
  });

  return {
    cardActivities: cardActivityQuery.data?.data || [],
    isLoading: cardActivityQuery.isLoading,
    isError: cardActivityQuery.isError,
    error: cardActivityQuery.error,
  }
}