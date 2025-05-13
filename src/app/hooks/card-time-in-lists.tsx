import { useQuery } from "@tanstack/react-query";
import { ApiResponse, CustomField } from "../types/type";
import { getCardTimeInList } from "../api/card_list_time";

/**
 * Hook to fetch time spent by a card in different lists
 */
export function useCardTimeInList(cardId: string) {
  // Main query for card time in lists
  const cardTimeInListQuery = useQuery({
    queryKey: ["cardTimeInList", cardId],
    queryFn: () => getCardTimeInList(cardId),
    enabled: !!cardId,
    staleTime: 5000, // Cache data for 5 seconds before considering it stale
  });

  return {
    timeInLists: cardTimeInListQuery.data?.data || [],
    isLoading: cardTimeInListQuery.isLoading,
    isError: cardTimeInListQuery.isError,
    error: cardTimeInListQuery.error,
    refetch: cardTimeInListQuery.refetch,
  };
}