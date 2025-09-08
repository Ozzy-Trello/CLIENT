import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRule, deleteRule } from "@api/automation_rule";
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
      console.log("🔍 [REFETCH DEBUG] Executing query for automation rules:", {
        workspaceId,
        boardId,
        page,
        limit,
        fetchAll,
        timestamp: new Date().toISOString()
      });
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
      console.log("🗑️ [REFETCH DEBUG] Starting delete mutation for rule:", ruleId);
      return deleteRule(workspaceId, ruleId);
    },
    onSuccess: (data, { ruleId }) => {
      console.log("✅ [REFETCH DEBUG] Delete mutation successful for rule:", ruleId);
      
      // Get current cache state before invalidation
      const currentQueries = queryClient.getQueriesData({ queryKey: ["automationRules"] });
      console.log("📊 [REFETCH DEBUG] Current cached queries before invalidation:", currentQueries.length);
      
      // Invalidate all automation rules queries to trigger refetch
      console.log("🔄 [REFETCH DEBUG] Invalidating automation rules queries...");
      queryClient.invalidateQueries({ 
        queryKey: ["automationRules"],
        exact: false // This ensures all queries starting with "automationRules" are invalidated
      });

      // Check cache state after invalidation
      const updatedQueries = queryClient.getQueriesData({ queryKey: ["automationRules"] });
      console.log("📊 [REFETCH DEBUG] Cache state after invalidation:", updatedQueries.length);

      message.success("Rule deleted successfully");
    },
    onError: (error: any) => {
      console.error("❌ [REFETCH DEBUG] Delete mutation failed:", error);
      message.error("Failed to delete rule. Please try again.");
    },
  });
};