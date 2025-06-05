import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cardCount } from "@api/card";

/**
 * Custom hook for fetching and managing dashcard counts
 * This hook integrates with React Query and the WebSocket system
 * to provide real-time updates when custom fields change
 */
export const useDashcardCount = (dashcardId: string) => {
  const queryClient = useQueryClient();

  const {
    data: count = 0,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["dashcardCount", dashcardId],
    queryFn: async () => {
      if (!dashcardId) return 0;
      
      const result = await cardCount(dashcardId);
      return result.data || 0;
    },
    staleTime: 30000, // 30 seconds
    enabled: !!dashcardId
  });

  /**
   * Force refresh the dashcard count
   * This can be called manually if needed
   */
  const refreshCount = () => {
    queryClient.invalidateQueries({ queryKey: ["dashcardCount", dashcardId] });
  };

  return {
    count,
    isLoading,
    isError,
    error,
    refreshCount,
    refetch
  };
};
