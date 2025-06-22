import { useQuery } from "@tanstack/react-query";
import { Card } from "@myTypes/card";
import { useParams } from "next/navigation";
import { getListDashcard } from "@api/card";
import { useQueryClient } from "@tanstack/react-query";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useEffect } from "react";

export const useDashcardList = (card: Card) => {
  const { setItemDashcard, setDashcardConfig } = useCardDetailContext();
  const queryClient = useQueryClient();
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;

  const result = useQuery({
    queryKey: ["list-dashcard", card?.id, workspaceId],
    queryFn: () => getListDashcard(workspaceId as string, card?.id),
    enabled: !!card?.id,
  });

  const refetchList = () => {
    queryClient.refetchQueries({
      queryKey: ["list-dashcard", card?.id, workspaceId],
    });
  };

  useEffect(() => {
    if (result.isSuccess) {
      console.log("masuuk");
      setItemDashcard(result.data?.data?.items || []);
      setDashcardConfig(result.data?.data?.dashConfig);
    }
  }, [result.isSuccess, result.data?.data]);

  return { resultData: result.data?.data, ...result, refetchList };
};
