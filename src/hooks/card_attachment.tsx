import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCardAttachment,
  deleteCardAttachment,
  updateCardAttachment,
  getCardAttachments,
} from "../api/card_attachment";
import { ApiResponse } from "../types/type";
import {
  TAttachableType,
  CardAttachment,
  TCardAttachmentType,
} from "../types/card";
import { useEffect, useMemo } from "react";
import { queryKeys } from "../constants/query-keys";

/**
 * Hook to manage card attachments
 */
export function useCardAttachment(cardId: string) {
  const queryClient = useQueryClient();

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
    }: {
      cardId: string;
      attachableType: TAttachableType;
      attachableId: string;
      isCover: boolean;
      type?: TCardAttachmentType;
    }) => {
      return createCardAttachment({
        cardId,
        attachableType,
        attachableId,
        isCover,
        type,
      });
    },
    onSuccess: (data, variables) => {
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
    },
  });

  // Delete attachment mutation with simple refetch approach
  const deleteAttachmentMutation = useMutation({
    mutationFn: ({
      attachmentId,
      cardId,
    }: {
      attachmentId: string;
      cardId: string;
    }) => {
      return deleteCardAttachment(attachmentId);
    },
    onSuccess: (data, variables) => {
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
    },
  });

  const markPrintedMutation = useMutation({
    mutationFn: (id: string) => updateCardAttachment(id, { is_printed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardAttachment", cardId] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.detail(cardId),
      });
    },
  });

  const markCoverMutation = useMutation({
    mutationFn: ({
      attachmentId,
      cardId,
    }: {
      attachmentId: string;
      cardId: string;
    }) => updateCardAttachment(attachmentId, { is_cover: true, cardId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cardAttachment", variables.cardId],
      });
      queryClient.invalidateQueries({
        queryKey: ["cards"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.cards.detail(variables.cardId),
      });
    },
  });

  const mappedAttachments = useMemo(
    () =>
      cardAttachmentQuery.data?.data?.map((a: any) => ({
        ...a,
        cardId: a.cardId || a.card_id,
        attachableType: a.attachableType || a.attachable_type,
        attachableId: a.attachableId || a.attachable_id,
        isCover: a.isCover ?? a.is_cover,
        isPrinted: a.isPrinted ?? a.is_printed,
        file: a.file
          ? {
              ...a.file,
              sizeUnit: a.file.sizeUnit || a.file.size_unit,
              mimeType: a.file.mimeType || a.file.mime_type,
              createdBy: a.file.createdBy || a.file.created_by,
              createdAt: a.file.createdAt || a.file.created_at,
              updatedAt: a.file.updatedAt || a.file.updated_at,
            }
          : undefined,
      })) || [],
    [cardAttachmentQuery.data]
  );

  return {
    cardAttachments:
      (mappedAttachments && mappedAttachments.length > 0
        ? mappedAttachments
        : cardAttachmentQuery.data?.data) || [],
    isLoading: cardAttachmentQuery.isLoading,
    isError: cardAttachmentQuery.isError,
    error: cardAttachmentQuery.error,
    addAttachment: addAttachmentMutation.mutate,
    deleteAttachment: deleteAttachmentMutation.mutate,
    isAddingAttachment: addAttachmentMutation.isPending,
    isDeletingAttachment: deleteAttachmentMutation.isPending,
    markPrinted: markPrintedMutation.mutate,
    isMarkingCover: markCoverMutation.isPending,
    markCover: markCoverMutation.mutate,
  };
}
