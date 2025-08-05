import { useQuery } from "@tanstack/react-query";
import { unifiedSearch, SearchResult, GroupedSearchResults } from "@api/search";

export const useUnifiedSearch = (
  query: string,
  workspaceId?: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  return useQuery({
    queryKey: ["unifiedSearch", query, workspaceId],
    queryFn: async () => {
      console.log("[SEARCH HOOK] Making search request:", {
        query,
        workspaceId,
      });
      const result = await unifiedSearch(query, workspaceId);
      console.log("[SEARCH HOOK] Search response:", result);
      return result;
    },
    enabled: options?.enabled ?? (!!query && query.trim().length > 0),
    staleTime: options?.staleTime ?? 30000, // 30 seconds
    select: (data) => {
      const searchData = data?.data || { cards: [], boards: [] };
      console.log("[SEARCH HOOK] Selected search data:", searchData);
      return searchData;
    },
  });
};

export type { SearchResult, GroupedSearchResults };
