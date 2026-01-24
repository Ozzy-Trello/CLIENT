import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRule, deleteRule, getTelegramChannels } from "@api/automation_rule";
import { AutomationRuleApiData } from "@myTypes/type";
import { message } from "antd";

/**
 * Hook for fetching automation rules with React Query
 */
export const useAutomationRules = (
  workspaceId: string,
  boardId?: string,
  page?: number,
  limit?: number,
  fetchAll?: boolean
) => {
  const queryKey = ["automationRules", workspaceId, boardId, page, limit, fetchAll];
  
  return useQuery({
    queryKey,
    queryFn: () => {
      return getRule(workspaceId, boardId, page, limit, fetchAll);
    },
    staleTime: 0, // Always consider data stale
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: false,
    enabled: !!workspaceId,
  });
};

/**
 * Hook for deleting automation rules with optimistic updates
 */
export const useDeleteAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, ruleId }: { workspaceId: string; ruleId: string }) => {
      return deleteRule(workspaceId, ruleId);
    },
    onSuccess: (data, { ruleId }) => {
      // Invalidate all automation rules queries to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: ["automationRules"],
        exact: false // This ensures all queries starting with "automationRules" are invalidated
      });

      message.success("Rule deleted successfully");
    },
    onError: (error: any) => {
      message.error("Failed to delete rule. Please try again.");
    },
  });
};

/**
 * Hook for fetching Telegram channels
 */
export const useTelegramChannels = () => {
  return useQuery({
    queryKey: ["telegramChannels"],
    queryFn: getTelegramChannels,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};