import { useQuery } from "@tanstack/react-query";
import {
  getUnfinishedCardNotes,
  UnfinishedCardNoteCard,
} from "@api/card_notes";
import { Pagination } from "@myTypes/type";

export const useUnfinishedCardNotes = (
  workspaceId: string,
  page: number = 1,
  limit: number = 50,
) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["unfinished-card-notes", workspaceId, page, limit],
    queryFn: async () => getUnfinishedCardNotes(workspaceId, page, limit),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    unfinishedCards: (data?.data ?? []) as UnfinishedCardNoteCard[],
    pagination: data?.paginate as Pagination | undefined,
    isLoading,
    refetch,
  };
};
