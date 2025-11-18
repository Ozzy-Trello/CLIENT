import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { mapBackendCardToFrontend } from "../api/card";
import { Card, EnumCardType } from "../types/card";
import { queryKeys } from "@constants/query-keys";
import { message } from "antd";

interface CreateSubcardVariables {
  parentCard: Card;
  name: string;
  listId?: string;
}

const resolveListId = (card?: Card, explicitListId?: string) => {
  if (explicitListId) return explicitListId;
  return card?.listId || (card as any)?.list_id || "";
};

async function createSubcardRequest({
  parentCard,
  name,
  listId,
}: CreateSubcardVariables) {
  const targetListId = resolveListId(parentCard, listId);

  if (!parentCard?.id || !targetListId) {
    throw new Error("Missing parent card or list information");
  }

  const payload = {
    name,
    list_id: targetListId,
    parent_id: parentCard.id,
    type: EnumCardType.Regular,
  };

  const { data } = await api.post(`/card`, payload, {
    headers: { "list-id": targetListId },
  });

  if (!data?.data) {
    return null;
  }

  return mapBackendCardToFrontend(data.data) as Card;
}

export function useCreateSubcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubcardRequest,
    onSuccess: (newCard, variables) => {
      const parentId = variables.parentCard?.id;
      const targetListId = resolveListId(
        variables.parentCard,
        variables.listId
      );

      if (parentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(parentId),
        });
      }

      if (targetListId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(targetListId),
        });
      }

      if (newCard?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(newCard.id),
        });
      }

      message.success("Sub card created");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create sub card";
      message.error(errorMessage);
    },
  });
}
