import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCardAttachment,
  deleteCardAttachment,
  getCardAttachments,
} from "../api/card_attachment";
import { ApiResponse } from "../types/type";
import {
  Card,
  TAttachableType,
  CardAttachment,
  TCardAttachmentType,
} from "../types/card";
import { AnyList } from "../types/list";
import { useEffect } from "react";
import { queryKeys } from "../constants/query-keys";

/**
 * Hook to manage card attachments
 */
export function useCardAttachment(
  cardId: string,
  defaults?: { listId?: string; boardId?: string }
) {
  const queryClient = useQueryClient();
  const defaultListId = defaults?.listId;
  const defaultBoardId = defaults?.boardId;

  const updateCachedCardCover = (
    targetCardId: string,
    coverUrl?: string | null,
    listId?: string,
    boardId?: string
  ) => {
    if (!coverUrl) return;

    if (listId) {
      queryClient.setQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(listId),
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((card) =>
              card.id === targetCardId ? { ...card, cover: coverUrl } : card
            ),
          };
        }
      );
    }

    queryClient.setQueryData<ApiResponse<Card>>(
      queryKeys.cards.detail(targetCardId),
      (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: { ...old.data, cover: coverUrl },
        };
      }
    );

    if (boardId) {
      queryClient.setQueryData<ApiResponse<AnyList[]>>(
        ["lists", boardId],
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((list) => {
              if (!list.cards || list.cards.length === 0) return list;
              const hasCard = list.cards.some(
                (card) => card.id === targetCardId
              );
              if (!hasCard) return list;
              return {
                ...list,
                cards: list.cards.map((card) =>
                  card.id === targetCardId ? { ...card, cover: coverUrl } : card
                ),
              };
            }),
          };
        }
      );
    }
  };

  const invalidateBoardLists = (boardId?: string) => {
    if (!boardId) return;
    queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    queryClient.invalidateQueries({
      queryKey: queryKeys.lists.board(boardId),
    });
  };

  const getCoverUrlFromResponse = (
    response?: ApiResponse<CardAttachment>
  ): string | null => {
    const attachment: any = response?.data;
    if (!attachment) return null;
    const isCover = attachment.isCover ?? attachment.is_cover;
    if (!isCover) return null;
    const file = attachment.file || attachment.file_data;
    if (file?.url) {
      return file.url;
    }
    return attachment.file_url ?? null;
  };

  // Main query for card attachments
  const cardAttachmentQuery = useQuery({
    queryKey: ["cardAttachment", cardId],
    queryFn: () => getCardAttachments(cardId),
    enabled: !!cardId,
    staleTime: 5000,
  });

  // WebSocket real-time refetch
  useEffect(() => {
    if (!cardId) return;
    const socket =
      typeof window !== "undefined" ? (window as any).socket : null;
    if (!socket) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (
          msg.event === "card_attachment:updated" &&
          msg.data?.cardId === cardId
        ) {
          queryClient.invalidateQueries({
            queryKey: ["cardAttachment", cardId],
          });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    socket.addEventListener("message", handler);
    return () => {
      socket.removeEventListener("message", handler);
    };
  }, [cardId, queryClient]);

  // Create attachment mutation with simple refetch approach
  const addAttachmentMutation = useMutation({
    mutationFn: ({
      cardId,
      attachableType,
      attachableId,
      isCover,
      type,
      listId,
      boardId,
    }: {
      cardId: string;
      attachableType: TAttachableType;
      attachableId: string;
      isCover: boolean;
      type?: TCardAttachmentType;
      listId?: string;
      boardId?: string;
    }) => {
      console.log("[cardAttachment] addAttachment mutation payload", {
        cardId,
        attachableType,
        attachableId,
        isCover,
        type,
        listId,
        boardId,
      });
      return createCardAttachment({
        cardId,
        attachableType,
        attachableId,
        isCover,
        type,
      });
    },
    onSuccess: (data, variables) => {
      const effectiveListId = variables.listId ?? defaultListId;
      const effectiveBoardId = variables.boardId ?? defaultBoardId;
      const coverUrl = getCoverUrlFromResponse(data);

      console.log("[cardAttachment] addAttachment success", {
        cardId: variables.cardId,
        listId: effectiveListId,
        boardId: effectiveBoardId,
      });

      if (coverUrl) {
        updateCachedCardCover(
          variables.cardId,
          coverUrl,
          effectiveListId,
          effectiveBoardId
        );
      }

      // Refetch attachments to get the latest data
      queryClient.invalidateQueries({
        queryKey: ["cardAttachment", variables.cardId],
      });
      queryClient.invalidateQueries({
        queryKey: ["cards"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.detail(variables.cardId),
      });
      if (effectiveListId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(effectiveListId),
        });
      }
      invalidateBoardLists(effectiveBoardId);
    },
  });

  // Delete attachment mutation with simple refetch approach
  const deleteAttachmentMutation = useMutation({
    mutationFn: ({
      attachmentId,
      cardId,
      listId,
      boardId,
    }: {
      attachmentId: string;
      cardId: string;
      listId?: string;
      boardId?: string;
    }) => {
      console.log("[cardAttachment] deleteAttachment mutation payload", {
        attachmentId,
        cardId,
        listId,
        boardId,
      });
      return deleteCardAttachment(attachmentId);
    },
    onSuccess: (data, variables) => {
      const effectiveListId = variables.listId ?? defaultListId;
      const effectiveBoardId = variables.boardId ?? defaultBoardId;
      console.log("[cardAttachment] deleteAttachment success", {
        cardId: variables.cardId,
        listId: effectiveListId,
        boardId: effectiveBoardId,
      });
      // Refetch attachments to get the latest data
      queryClient.invalidateQueries({
        queryKey: ["cardAttachment", variables.cardId],
      });
      queryClient.invalidateQueries({
        queryKey: ["cards"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.detail(variables.cardId),
      });
      if (effectiveListId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.list(effectiveListId),
        });
      }
      invalidateBoardLists(effectiveBoardId);
    },
  });

  return {
    cardAttachments: cardAttachmentQuery.data?.data || [],
    isLoading: cardAttachmentQuery.isLoading,
    isError: cardAttachmentQuery.isError,
    error: cardAttachmentQuery.error,
    addAttachment: addAttachmentMutation.mutate,
    deleteAttachment: deleteAttachmentMutation.mutate,
    isAddingAttachment: addAttachmentMutation.isPending,
    isDeletingAttachment: deleteAttachmentMutation.isPending,
  };
}
