import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Card } from "@myTypes/card";
import { ApiResponse } from "@myTypes/type";

export function useArchivedCards(boardId: string, search: string) {
  return useQuery<ApiResponse<Card[]>>({
    queryKey: ["archived-cards", boardId, search],
    enabled: !!boardId,
    queryFn: async () => {
      const { data } = await api.get(`/card/archived`, {
        params: { board_id: boardId, q: search },
      });
      return data;
    },
  });
}
