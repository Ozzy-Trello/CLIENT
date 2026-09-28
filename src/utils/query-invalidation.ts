import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";

/**
 * Invalidates all queries related to a card's parent board and list.
 * Call this whenever any card detail is updated to keep the UI in sync.
 */
export function invalidateCardContext(
  queryClient: QueryClient,
  params: {
    cardId: string;
    listId: string;
    boardId: string;
  }
) {
  const { cardId, listId, boardId } = params;

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
  });

  queryClient.invalidateQueries({
    queryKey: ["cardAttachment", cardId],
  });

  queryClient.invalidateQueries({
    queryKey: ["cardCustomField", cardId],
  });

  queryClient.invalidateQueries({
    queryKey: ["checklists", cardId],
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.lists.detail(listId),
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.list(listId),
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.boards.detail(boardId),
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.boards.withLists(boardId),
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.all,
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.planner.all,
  });
}

/**
 * Narrow refresh for a single custom field value.
 *
 * The full invalidateCardContext also drops queryKeys.cards.all, which is a
 * prefix of every list and every card query, so each save refetched all loaded
 * lists plus the planner. Over HTTP/1.1 (6 sockets per origin) those refetches
 * queued behind each other and the delay compounded per save. The mutation
 * already writes the server response into the caches, so only the card and its
 * own list need to refetch here.
 */
export function invalidateCardFieldValue(
  queryClient: QueryClient,
  params: { cardId: string; listId?: string | null }
) {
  const { cardId, listId } = params;

  queryClient.invalidateQueries({
    queryKey: queryKeys.cards.detail(cardId),
  });

  if (listId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.cards.list(listId),
    });
  }
}

export function resolveCardContextForInvalidation(
  queryClient: QueryClient,
  cardId: string
) {
  const cardDetailQuery = queryClient.getQueryData<any>(
    queryKeys.cards.detail(cardId)
  );
  const cardData = cardDetailQuery?.data;

  if (!cardData) return null;

  const listId = cardData.listId || cardData.list_id;
  const boardId = cardData.boardId || cardData.board_id;

  if (!listId || !boardId) return null;

  return {
    cardId,
    listId,
    boardId,
  };
}
