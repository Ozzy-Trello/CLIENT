import { addCardActivity, cardAcitivities } from "@api/card_activity";
import { CardActivity } from "@myTypes/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCardActivity = (cardId: string) => {
  const queryClient = useQueryClient();
    
  const cardActivityQuery = useQuery({
    queryKey: ["cardActivity", cardId],
    queryFn: () => cardAcitivities(cardId),
    enabled: !!cardId,
    staleTime: 5000,
  });
  
  const addCardActivityMutation = useMutation({
    mutationFn: (payload: CardActivity) => {
      
      if (!cardId) {
        throw new Error("Card ID is required");
      }
      
      return addCardActivity(cardId, payload);
    },
    onMutate: (variables) => {
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded with data:", data);
      queryClient.invalidateQueries({ queryKey: ["cardActivity", cardId] });
    },
    onError: (error) => {
    },
    onSettled: () => {
    }
  });

  return {
    cardActivities: cardActivityQuery.data?.data || [],
    isLoading: cardActivityQuery.isLoading,
    isError: cardActivityQuery.isError,
    error: cardActivityQuery.error,
    addCardActivity: (payload: CardActivity) => {
      addCardActivityMutation.mutate(payload);
    },
    isAddingActivity: addCardActivityMutation.isPending,
    addActivityError: addCardActivityMutation.error,
    mutationState: addCardActivityMutation.status,
    resetMutation: addCardActivityMutation.reset
  }
}