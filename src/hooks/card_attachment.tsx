import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCardAttachment,
  deleteCardAttachment,
  updateCardAttachment,
  getCardAttachments,
} from "../api/card_attachment";
import { mapBackendAttachmentToFrontend } from "../api/card";
import { ApiResponse } from "../types/type";
import {
  TAttachableType,
  CardAttachment,
  TCardAttachmentType,
} from "../types/card";
import { useEffect, useMemo } from "react";
import { queryKeys } from "../constants/query-keys";
import {
  invalidateCardContext,
  resolveCardContextForInvalidation,
} from "@utils/query-invalidation";

/**
 * Hook to manage card attachments
 */
export function useCardAttachment(
  cardId: string,
  options?: {
    initialData?: CardAttachment[] | any[];
    fetch?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const shouldFetch = options?.fetch !== false;

  // Main query for card attachments
  const cardAttachmentQuery = useQuery({
    queryKey: ["cardAttachment", cardId],
    queryFn: () => getCardAttachments(cardId),
    enabled: !!cardId && shouldFetch,
    staleTime: 5000,
    initialData: options?.initialData
      ? {
          data: options.initialData,
        }
      : undefined,
  });

  // WebSocket real-time refetch
  useEffect(() => {
    if (!cardId || !shouldFetch) return;
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
  }, [cardId, queryClient, shouldFetch]);

  const invalidateCardAndRelated = (targetCardId: string) => {
    const cardContext = resolveCardContextForInvalidation(
      queryClient,
      targetCardId
    );

    if (cardContext) {
      invalidateCardContext(queryClient, cardContext);
      return;
    }

    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.all,
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.detail(targetCardId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.planner.all,
    });
  };

  // Create attachment mutation with simple refetch approach
  const addAttachmentMutation = useMutation({
    mutationFn: ({
      cardId,
      attachableType,
      attachableId,
      isCover,
      type,
      metadata,
    }: {
      cardId: string;
      attachableType: TAttachableType;
      attachableId?: string;
      isCover: boolean;
      type?: TCardAttachmentType;
      metadata?: {
        url?: string;
        displayText?: string;
        favicon?: string;
      };
    }) => {
      return createCardAttachment({
        cardId,
        attachableType,
        attachableId,
        isCover,
        type,
        metadata,
      });
    },
    onSuccess: (_, variables) => {
      // Refetch attachments to get the latest data
      queryClient.invalidateQueries({
        queryKey: ["cardAttachment", variables.cardId],
      });
      invalidateCardAndRelated(variables.cardId);
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
    onSuccess: (_, variables) => {
      // Refetch attachments to get the latest data
      queryClient.invalidateQueries({
        queryKey: ["cardAttachment", variables.cardId],
      });
      invalidateCardAndRelated(variables.cardId);
    },
  });

  const markPrintedMutation = useMutation({
    mutationFn: (id: string) => updateCardAttachment(id, { is_printed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardAttachment", cardId] });
      invalidateCardAndRelated(cardId);
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
      invalidateCardAndRelated(variables.cardId);
    },
  });

  const updateLinkDisplayTextMutation = useMutation({
    mutationFn: ({
      attachmentId,
      cardId,
      displayText,
      url,
    }: {
      attachmentId: string;
      cardId: string;
      displayText: string;
      url: string;
    }) => updateCardAttachment(attachmentId, {
      cardId,
      metadata: { displayText, url },
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["cardAttachment", variables.cardId],
      });
      invalidateCardAndRelated(variables.cardId);
    },
  });

  const mappedAttachments = useMemo(() => {
    const sourceData =
      cardAttachmentQuery.data?.data ?? options?.initialData ?? [];
    return (sourceData as any[]).map(mapBackendAttachmentToFrontend);
  }, [cardAttachmentQuery.data, options?.initialData]);

  return {
    cardAttachments:
      (mappedAttachments && mappedAttachments.length > 0
        ? mappedAttachments
        : cardAttachmentQuery.data?.data) || [],
    isLoading: shouldFetch ? cardAttachmentQuery.isLoading : false,
    isError: shouldFetch ? cardAttachmentQuery.isError : false,
    error: shouldFetch ? cardAttachmentQuery.error : undefined,
    addAttachment: addAttachmentMutation.mutate,
    deleteAttachment: deleteAttachmentMutation.mutate,
    isAddingAttachment: addAttachmentMutation.isPending,
    isDeletingAttachment: deleteAttachmentMutation.isPending,
    markPrinted: markPrintedMutation.mutate,
    updateLinkDisplayText: updateLinkDisplayTextMutation.mutate,
    isUpdatingLinkDisplayText: updateLinkDisplayTextMutation.isPending,
    isMarkingCover: markCoverMutation.isPending,
    markCover: markCoverMutation.mutate,
    refetch: cardAttachmentQuery.refetch,
  };
}
