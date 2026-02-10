import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cardCount } from "@api/card";
import { useParams } from "next/navigation";

/**
 * Custom hook for fetching and managing dashcard counts
 * This hook integrates with React Query and the WebSocket system
 * to provide real-time updates when custom fields change
 */
export const useDashcardCount = (
  dashcardId: string,
  options?: {
    enabled?: boolean;
  }
) => {
  const queryClient = useQueryClient();
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;

  const {
    data: count = 0,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashcardCount", dashcardId],
    queryFn: async () => {
      if (!dashcardId) return 0;

      const result = await cardCount(dashcardId, workspaceId);
      return result.data || 0;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // background refresh every 2 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!dashcardId && !!workspaceId && (options?.enabled ?? true),
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
    refetch,
  };
};
