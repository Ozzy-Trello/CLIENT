import { addCardActivity, cardAcitivities } from "@api/card_activity";
import { CardActivity } from "@myTypes/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCardActivity = (cardId: string) => {
  const queryClient = useQueryClient();
  
  console.log("useCardActivity called with cardId:", cardId);
  
  const cardActivityQuery = useQuery({
    queryKey: ["cardActivity", cardId],
    queryFn: () => cardAcitivities(cardId),
    enabled: !!cardId,
    staleTime: 5000,
  });
  
  const addCardActivityMutation = useMutation({
    mutationFn: (payload: CardActivity) => {
      console.log("Mutation function called with payload:", payload);
      console.log("Using cardId:", cardId);
      
      if (!cardId) {
        throw new Error("Card ID is required");
      }
      
      return addCardActivity(cardId, payload);
    },
    onMutate: (variables) => {
      console.log("Mutation starting with variables:", variables);
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded with data:", data);
      queryClient.invalidateQueries({ queryKey: ["cardActivity", cardId] });
    },
    onError: (error) => {
      console.error("Mutation failed with error:", error);
    },
    onSettled: () => {
      console.log("Mutation settled (completed)");
    }
  });

  console.log("Mutation state:", {
    isPending: addCardActivityMutation.isPending,
    isError: addCardActivityMutation.isError,
    error: addCardActivityMutation.error,
    isSuccess: addCardActivityMutation.isSuccess
  });

  return {
    cardActivities: cardActivityQuery.data?.data || [],
    isLoading: cardActivityQuery.isLoading,
    isError: cardActivityQuery.isError,
    error: cardActivityQuery.error,
    addCardActivity: (payload: CardActivity) => {
      console.log("addCardActivity wrapper called with:", payload);
      console.log("About to call mutate...");
      addCardActivityMutation.mutate(payload);
    },
    isAddingActivity: addCardActivityMutation.isPending,
    addActivityError: addCardActivityMutation.error,
    mutationState: addCardActivityMutation.status,
    resetMutation: addCardActivityMutation.reset
  }
}