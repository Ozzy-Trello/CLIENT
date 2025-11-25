import { useQuery } from "@tanstack/react-query";
import { Card } from "@myTypes/card";
import { useParams } from "next/navigation";
import { getListDashcard } from "@api/card";
import { useQueryClient } from "@tanstack/react-query";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useEffect } from "react";

export const useDashcardList = (card: Card | null) => {
  const { setItemDashcard, setDashcardConfig } = useCardDetailContext();
  const queryClient = useQueryClient();
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;

  const cardId = card?.id;

  const result = useQuery({
    queryKey: ["list-dashcard", cardId, workspaceId],
    queryFn: () => getListDashcard(workspaceId as string, cardId as string),
    enabled: !!cardId,
  });

  const refetchList = () => {
    queryClient.refetchQueries({
      queryKey: ["list-dashcard", card?.id, workspaceId],
    });
  };

  useEffect(() => {
    if (result.isSuccess) {
      setItemDashcard(result.data?.data?.items || []);
      setDashcardConfig(result.data?.data?.dashConfig);
    }
  }, [result.isSuccess, result.data?.data]);

  return { resultData: result.data?.data, ...result, refetchList };
};
