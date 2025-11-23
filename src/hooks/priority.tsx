import { getPriorities } from "@api/priority";
import { queryKeys } from "@constants/query-keys";
import { useQuery } from "@tanstack/react-query";

export function usePriorities(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.priorities.all,
    queryFn: getPriorities,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
