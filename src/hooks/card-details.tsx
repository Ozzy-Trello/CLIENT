import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useCardDetails(cardId: string, boardId: string) {
  return useQuery({
    queryKey: ['cardDetails', cardId, boardId],
    queryFn: () => api.get(`/card/${cardId}`, {
      headers: {
        "board-id": boardId
      }
    }),
    enabled: !!cardId && !!boardId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}