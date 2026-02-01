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
      const result = await unifiedSearch(query, workspaceId);
      return result;
    },
    enabled: options?.enabled ?? (!!query && query.trim().length > 0),
    staleTime: options?.staleTime ?? 30000, // 30 seconds
    select: (data) => {
      const searchData = data?.data || { cards: [], boards: [] };
      return searchData;
    },
  });
};

export type { SearchResult, GroupedSearchResults };
