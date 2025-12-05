import { addCardActivity, cardAcitivities } from "@api/card_activity";
import { CardActivity } from "@myTypes/card";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export const useCardActivity = (
  cardId: string,
  options?: {
    enabled?: boolean;
  }
) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [allActivities, setAllActivities] = useState<CardActivity[]>([]);
  const limit = 10;
  const isEnabled = !!cardId && (options?.enabled ?? true);

  // Use React Query for the main activities query
  const {
    data: activitiesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["cardActivity", cardId, page],
    queryFn: () => cardAcitivities(cardId, page, limit),
    enabled: isEnabled,
    staleTime: 5000,
  });

  // Update all activities when data changes
  useEffect(() => {
    if (!isEnabled) {
      setAllActivities([]);
      return;
    }

    if (activitiesData?.data) {
      if (page === 1) {
        setAllActivities(activitiesData.data);
      } else {
        setAllActivities((prev) => [...prev, ...activitiesData.data]);
      }
    }
  }, [activitiesData, page, isEnabled]);

  const total = Number(
    activitiesData?.paginate?.totalData || activitiesData?.paginate?.total || 0
  );
  const hasMore = allActivities.length < total;
  const isLoadingMore = false; // We'll handle this differently

  const loadMore = async () => {
    if (!hasMore || isLoading) return;
    setPage((prev) => prev + 1);
  };

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (!isEnabled || !cardId) return;
    const socket =
      typeof window !== "undefined" ? (window as any).socket : null;
    if (!socket) return;

    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (
          message.event === "card_activity:added" &&
          message.data?.cardId === cardId
        ) {
          // Reset to page 1 and refetch
          setPage(1);
          refetch();
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [cardId, refetch, isEnabled]);

  const addCardActivityMutation = useMutation({
    mutationFn: (payload: CardActivity) => {
      if (!cardId) {
        throw new Error("Card ID is required");
      }
      return addCardActivity(cardId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardActivity", cardId] });
      // Reset to page 1 and refetch
      setPage(1);
      refetch();
    },
  });

  return {
    cardActivities: allActivities,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    addCardActivity: (payload: CardActivity) => {
      addCardActivityMutation.mutate(payload);
    },
    isAddingActivity: addCardActivityMutation.isPending,
    addActivityError: addCardActivityMutation.error,
    mutationState: addCardActivityMutation.status,
    resetMutation: addCardActivityMutation.reset,
  };
};
