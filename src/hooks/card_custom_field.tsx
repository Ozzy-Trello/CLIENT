import { useQuery, useQueryClient } from "@tanstack/react-query"
import { cardCustomFields } from "../api/card_custom_field";
import { ApiResponse } from "../types/type";
import { CardCustomField } from "@myTypes/card";

export const useCardCustomField = (cardId: string, workspaceId: string) => {
  const queryClient = useQueryClient();
  
  // Main query for card custom fields
  const cardCustomFieldQuery = useQuery({
    queryKey: ["cardCustomField", cardId, workspaceId],
    queryFn: () => cardCustomFields(cardId, workspaceId),
    enabled: !!cardId,
    staleTime: 5000,
  });

  return {
    cardCustomFields: cardCustomFieldQuery.data?.data || [],
    isLoading: cardCustomFieldQuery.isLoading,
    isError: cardCustomFieldQuery.isError,
    error: cardCustomFieldQuery.error,
  };
};