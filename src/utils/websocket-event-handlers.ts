import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import {
  BatchUpdateEvent,
  EnumBackendWebSocketEvent,
  EnumUserActionEvent,
  WebSocketEventPayload,
} from "@myTypes/event";

/**
 * Handle board.card.moved automation events by invalidating
 * the card/list/board caches that are affected.
 */
export function handleCardMoved(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const payloadCard = (data as any).card;
  const { cardId: payloadCardId, listId: toListId, boardId, changes } = data;
  const cardId = payloadCardId || payloadCard?.id;
  let fromListId = changes?.oldListId;

  if (!fromListId && cardId) {
    const listQueries = queryClient
      .getQueryCache()
      .findAll({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "cards" &&
          query.queryKey[1] === "list",
      });

    for (const query of listQueries) {
      const key = query.queryKey as any[];
      const candidateListId = key[2] as string | undefined;
      const cached: any = query.state.data;
      const exists = cached?.data?.some?.((card: any) => card.id === cardId);
      if (candidateListId && exists) {
        fromListId = candidateListId;
        break;
      }
    }
  }

  if (!cardId || !toListId || !fromListId) {
    console.warn("[WS] Card moved event missing required fields", data);
    return;
  }

  console.log("[WS] 🔄 handleCardMoved:", { cardId, fromListId, toListId, boardId });

  const sourceListCache: any = queryClient.getQueryData(
    queryKeys.cards.list(fromListId)
  );
  const sourceCard =
    sourceListCache?.data?.find((card: any) => card.id === cardId) || null;
  const detailCache: any = queryClient.getQueryData(
    queryKeys.cards.detail(cardId)
  );
  const detailCard = detailCache?.data || null;
  const movedCard = payloadCard || sourceCard || detailCard;

  // Remove card from source list cache
  queryClient.setQueryData(
    queryKeys.cards.list(fromListId),
    (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.filter((c: any) => c.id !== cardId),
      };
    }
  );

  // Add card to destination list cache immediately to avoid "missing until refresh".
  if (movedCard) {
    queryClient.setQueryData(
      queryKeys.cards.list(toListId),
      (old: any) => {
        const nextCard = {
          ...movedCard,
          listId: toListId,
          list_id: toListId,
        };

        if (!old?.data) {
          return { ...old, data: [nextCard] };
        }

        const withoutExisting = old.data.filter((c: any) => c.id !== cardId);
        return {
          ...old,
          data: [nextCard, ...withoutExisting],
        };
      }
    );
  }

  // IMPORTANT: Directly update the card detail cache with the new listId
  // This ensures the "in list" dropdown updates immediately without refresh
  queryClient.setQueryData(
    queryKeys.cards.detail(cardId),
    (old: any) => {
      if (!old?.data) return old;
      console.log("[WS] 📝 Updating card detail listId from", old.data.listId, "to", toListId);
      return {
        ...old,
        data: { 
          ...old.data, 
          listId: toListId,
          list_id: toListId, // Also set snake_case version
        },
      };
    }
  );

  // Invalidate source and destination list queries
  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.list(fromListId),
  });
  if (fromListId !== toListId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(toListId),
      refetchType: "all",
    });
  }
  
  // Force refetch card detail to get complete updated data
  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
    refetchType: "all",
  });
  
  if (boardId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.lists.board(boardId),
    });
  }
}

/**
 * Handle custom field updates emitted by automation actions.
 */
export function handleCustomFieldUpdated(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { cardId, listId, boardId, workspaceId } = data;

  if (!cardId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
  });
  queryClient.invalidateQueries({
    queryKey: ["cardCustomFields", cardId],
  });

  if (workspaceId) {
    queryClient.invalidateQueries({
      queryKey: ["cardCustomField", cardId, workspaceId],
    });
    queryClient.invalidateQueries({
      queryKey: ["customFields", workspaceId],
    });
  }

  if (listId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  }

  if (boardId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.lists.board(boardId),
    });
  }
}

/**
 * Custom field cleared events reuse the standard invalidation flow.
 */
export function handleCustomFieldCleared(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  handleCustomFieldUpdated(queryClient, data);
}

/**
 * Checklist item automation events refresh checklist/card detail caches.
 */
export function handleChecklistItemEvent(
  queryClient: QueryClient,
  data: WebSocketEventPayload,
  eventType?: string
) {
  const { cardId, changes } = data;
  const checklistId =
    changes?.checklistId ||
    (data as any)?.checklistId ||
    (data as any)?.checklist?.id;
  const explicitListId =
    data.listId ||
    (data as any)?.list_id ||
    (data as any)?.card?.listId ||
    (data as any)?.card?.list_id;

  let checklistDoneDelta = 0;
  let checklistTotalDelta = 0;

  const itemChecked =
    (data as any)?.item?.checked ??
    (changes as any)?.item?.checked ??
    (data as any)?.changes?.item?.checked;

  switch (eventType) {
    case EnumBackendWebSocketEvent.CARD_CHECKLIST_ITEM_CHECKED:
    case EnumUserActionEvent.ChecklistItemChecked:
      checklistDoneDelta = 1;
      break;
    case EnumBackendWebSocketEvent.CARD_CHECKLIST_ITEM_UNCHECKED:
    case EnumUserActionEvent.ChecklistItemUnchecked:
      checklistDoneDelta = -1;
      break;
    case EnumBackendWebSocketEvent.CARD_CHECKLIST_ITEM_ADDED:
    case EnumUserActionEvent.ChecklistItemAdded:
      checklistTotalDelta = 1;
      if (itemChecked) checklistDoneDelta = 1;
      break;
    case EnumBackendWebSocketEvent.CARD_CHECKLIST_ITEM_REMOVED:
    case EnumUserActionEvent.ChecklistItemRemoved:
      checklistTotalDelta = -1;
      if (itemChecked) checklistDoneDelta = -1;
      break;
    default:
      break;
  }

  if (cardId) {
    queryClient.invalidateQueries({
      queryKey: ["checklists", cardId],
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.detail(cardId),
    });
  }

  if (checklistId) {
    queryClient.invalidateQueries({
      queryKey: ["checklist", checklistId],
    });
  }

  const affectedListIds = new Set<string>();
  if (explicitListId) {
    affectedListIds.add(explicitListId);
  }

  if (cardId) {
    const listQueries = queryClient.getQueryCache().findAll({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "cards" &&
        query.queryKey[1] === "list",
    });

    for (const query of listQueries) {
      const key = query.queryKey as any[];
      const candidateListId = key[2] as string | undefined;
      const cached: any = query.state.data;
      const exists = cached?.data?.some?.((card: any) => card.id === cardId);

      if (!candidateListId || !exists) continue;
      affectedListIds.add(candidateListId);

      if (checklistDoneDelta !== 0 || checklistTotalDelta !== 0) {
        queryClient.setQueryData(key, (old: any) => {
          if (!old?.data || !Array.isArray(old.data)) return old;

          return {
            ...old,
            data: old.data.map((card: any) => {
              if (card.id !== cardId) return card;

              const currentDone = Number(
                card?.checklistDone ?? card?.checklist_done ?? 0
              );
              const currentTotal = Number(
                card?.checklistTotal ?? card?.checklist_total ?? 0
              );

              const nextDone = Math.max(0, currentDone + checklistDoneDelta);
              const nextTotal = Math.max(0, currentTotal + checklistTotalDelta);

              return {
                ...card,
                checklistDone: nextDone,
                checklistTotal: nextTotal,
                checklist_done: nextDone,
                checklist_total: nextTotal,
              };
            }),
          };
        });
      }
    }
  }

  affectedListIds.forEach((listId) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  });
}

/**
 * Member add/remove events refresh card, members, and list queries.
 */
export function handleCardMemberEvent(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { cardId, workspaceId, listId } = data;

  if (!cardId) return;

  queryClient.invalidateQueries({
    queryKey: ["cardMembers", cardId],
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
  });

  if (listId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  }
}

/**
 * Attachment add/remove events refresh card detail and attachments cache.
 */
export function handleCardAttachmentEvent(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { cardId, listId } = data;

  if (!cardId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
  });
  queryClient.invalidateQueries({
    queryKey: ["cardAttachment", cardId],
  });

  if (listId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  }
}

/**
 * Handle card unarchived events.
 */
export function handleCardUnarchived(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { cardId, listId, boardId } = data;

  if (!cardId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.archived(),
  });

  if (listId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  }

  if (boardId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.lists.board(boardId),
    });
  }
}

/**
 * Handle card copied events to refresh destination list.
 */
export function handleCardCopied(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { listId, boardId } = data;

  if (!listId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.list(listId),
  });

  if (boardId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.lists.board(boardId),
    });
  }
}

/**
 * List archived events should refresh board/list related cache.
 */
export function handleListArchived(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { listId, boardId } = data;

  if (!listId || !boardId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.lists.board(boardId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.boards.detail(boardId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.boards.withLists(boardId),
  });
}

/**
 * Board metadata updates (workspace level) should refresh board caches.
 */
export function handleBoardUpdated(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { boardId, workspaceId } = data;

  if (!boardId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.boards.detail(boardId),
  });

  if (workspaceId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.boards.workspace(workspaceId),
    });
  }
}

/**
 * Card date updates refresh card detail/list queries.
 */
export function handleCardDateUpdated(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { cardId, listId } = data;

  if (!cardId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
  });

  if (listId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  }
}

/**
 * Card completion status changed should refresh relevant caches.
 */
export function handleCardCompletionChanged(
  queryClient: QueryClient,
  data: WebSocketEventPayload
) {
  const { cardId, listId } = data;

  if (!cardId) return;

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
  });

  if (listId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  }
}

/**
 * Handle batch events from cascade automations by invalidating all touched lists/boards/cards.
 */
export function handleBatchUpdate(
  queryClient: QueryClient,
  batchData: BatchUpdateEvent
) {
  if (!batchData.events || !Array.isArray(batchData.events)) {
    console.warn("[WS] Invalid batch update event", batchData);
    return;
  }

  console.log(
    `[WS] Processing batch update with ${batchData.count} events`
  );

  const boardIds = new Set<string>();
  const listIds = new Set<string>();
  const cardIds = new Set<string>();

  batchData.events.forEach((evt) => {
    const data = evt.data as WebSocketEventPayload;
    if (data.boardId) boardIds.add(data.boardId);
    if (data.listId) listIds.add(data.listId);
    if (data.cardId) cardIds.add(data.cardId);
  });

  boardIds.forEach((boardId) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.boards.detail(boardId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.lists.board(boardId),
    });
  });

  listIds.forEach((listId) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  });

  cardIds.forEach((cardId) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.detail(cardId),
    });
  });
}
