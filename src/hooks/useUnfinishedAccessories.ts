import { useQuery } from "@tanstack/react-query";
import {
  getUnfinishedCardAccessories,
  UnfinishedAccessoryCard,
} from "@api/unfinished-accessory";
import { Pagination } from "@myTypes/type";

export const useUnfinishedAccessories = (
  workspaceId: string,
  page: number = 1,
  limit: number = 50
) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["unfinished-accessories", workspaceId, page, limit],
    queryFn: async () => {
      const response = await getUnfinishedCardAccessories(workspaceId, page, limit);
      return response;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    unfinishedCards: (data?.data ?? []) as UnfinishedAccessoryCard[],
    pagination: data?.paginate as Pagination | undefined,
    isLoading,
    refetch,
  };
};
