import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useCardDetails(cardId: string) {
  return useQuery({
    queryKey: ['cardDetails', cardId],
    queryFn: () => api.get(`/card/${cardId}`),
    enabled: !!cardId, 
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}