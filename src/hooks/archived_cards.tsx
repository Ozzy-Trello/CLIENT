import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Card } from "@myTypes/card";
import { ApiResponse } from "@myTypes/type";

export function useArchivedCards(
  boardId: string,
  search: string,
  enabled = true
) {
  return useQuery<ApiResponse<Card[]>>({
    queryKey: ["archived-cards", boardId, search],
    enabled: enabled && !!boardId,
    queryFn: async () => {
      const { data } = await api.get(`/card/archived`, {
        headers: { "board-id": boardId },
        params: { q: search },
      });
      return data;
    },
  });
}
