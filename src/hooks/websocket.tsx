import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import camelcaseKeys from "camelcase-keys";
import { EnumUserActionEvent } from "@myTypes/event";
import { queryKeys } from "@constants/query-keys";

// Custom hook to manage WebSocket connection
export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Make sure the WebSocket URL is correctly formatted
    const wsUrl =
      process.env.NEXT_PUBLIC_BE_BASE_URL?.replace("http", "ws") + "/ws";
    console.log("Connecting to WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected successfully");
      setIsConnected(true);
      setSocket(ws);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { socket, isConnected };
}

// Hook to handle WebSocket card updates with query invalidation
export function useWebSocketCardUpdates(socket: WebSocket | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        let message = JSON.parse(event.data);
        message = camelcaseKeys(message, { deep: true });
        console.log("WebSocket message received:", message);

        switch (message.event) {
          case "connection":
            console.log(
              "WebSocket connection confirmed:",
              message.data.message
            );
            break;

          case EnumUserActionEvent.CardMoved:
            const { card, fromListId, toListId } = message.data;
            console.log(
              `Card ${card.id} moved from ${fromListId} to ${toListId}`
            );

            // invalidate all related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(fromListId),
            });
            if (fromListId !== toListId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(toListId),
              });
            }
            // Also invalidate the specific card detail
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(card.id),
            });
            break;

          case EnumUserActionEvent.CardUpdated:
            const { card: updatedCard, listId } = message.data;
            console.log(`Card ${updatedCard.id} updated in list ${listId}`);

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(listId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(updatedCard.id),
            });
            break;

          case EnumUserActionEvent.CardCreated:
            const { card: newCard, listId: newCardListId } = message.data;
            console.log(
              `New card ${newCard.id} created in list ${newCardListId}`
            );

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(newCardListId),
            });
            break;

          case EnumUserActionEvent.CardDeleted:
            const { cardId: deletedCardId, listId: deletedCardListId } =
              message.data;
            console.log(
              `Card ${deletedCardId} deleted from list ${deletedCardListId}`
            );

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(deletedCardListId),
            });
            // Remove the specific card from cache
            queryClient.removeQueries({
              queryKey: queryKeys.cards.detail(deletedCardId),
            });
            break;

          case EnumUserActionEvent.CardArchived:
            const { card: archivedCard } = message.data;
            console.log(
              `Card ${archivedCard.id} archived from list ${
                archivedCard.listId || archivedCard.list_id
              }`
            );

            // Get the correct listId (handle both camelCase and snake_case)
            const archiveListId = archivedCard.listId || archivedCard.list_id;

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(archiveListId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(archivedCard.id),
            });
            // Also invalidate archived cards query if it exists
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.archived(),
            });
            break;

          case "custom_field:updated":
            const { cardId, customField, workspaceId } = message.data;
            console.log(
              `Custom field ${customField.id} updated for card ${cardId} in workspace ${workspaceId}`
            );

            // Invalidate relevant queries
            // For dashcard counts, we need to invalidate all dashcard count queries
            // since we don't know which dashcards might be affected by this custom field change
            queryClient.invalidateQueries({
              queryKey: ["dashcardCount"],
              // This will invalidate all dashcard count queries regardless of the specific dashcard ID
              // which ensures all dashcards that depend on this custom field will be updated
              exact: false,
            });

            // Also invalidate the specific card's custom field data with correct query key
            queryClient.invalidateQueries({
              queryKey: ["cardCustomField", cardId, workspaceId],
            });

            // Also invalidate any queries that might use just cardId (for backward compatibility)
            queryClient.invalidateQueries({
              queryKey: ["cardCustomField", cardId],
            });

            // Invalidate the card detail as well
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate all card list queries (card positions may depend on custom fields)
            queryClient.invalidateQueries({
              queryKey: ["cards"],
              exact: false,
            });
            break;

          case EnumUserActionEvent.ListCreated:
            const {
              list: createdList,
              boardId: createdBoardId,
              createdBy,
            } = message.data;
            console.log(
              `List ${createdList.id} created in board ${createdBoardId} by ${createdBy}`
            );

            // Invalidate relevant queries
            queryClient.invalidateQueries({
              queryKey: queryKeys.lists.board(createdBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.detail(createdBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.withLists(createdBoardId),
            });
            break;

          case EnumUserActionEvent.ListMoved:
            const {
              list: movedList,
              boardId: movedBoardId,
              previousPosition,
              targetPosition,
              movedBy,
            } = message.data;
            console.log(
              `List ${movedList.id} moved from position ${previousPosition} to ${targetPosition} in board ${movedBoardId} by ${movedBy}`
            );

            // Invalidate relevant queries
            queryClient.invalidateQueries({
              queryKey: queryKeys.lists.board(movedBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.detail(movedBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.withLists(movedBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.lists.detail(movedList.id),
            });
            break;

          case EnumUserActionEvent.ListUpdated:
            const { list: updatedList, boardId: updatedBoardId } = message.data;
            console.log(
              `List ${updatedList.id} updated in board ${updatedBoardId}`
            );

            // Invalidate relevant queries
            queryClient.invalidateQueries({
              queryKey: queryKeys.lists.board(updatedBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.lists.detail(updatedList.id),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.detail(updatedBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.withLists(updatedBoardId),
            });
            break;

          case EnumUserActionEvent.ListDeleted:
            const { listId: deletedListId, boardId: deletedBoardId } =
              message.data;
            console.log(
              `List ${deletedListId} deleted from board ${deletedBoardId}`
            );

            // Invalidate relevant queries
            queryClient.invalidateQueries({
              queryKey: queryKeys.lists.board(deletedBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.detail(deletedBoardId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.withLists(deletedBoardId),
            });
            // Remove the specific list from cache
            queryClient.removeQueries({
              queryKey: queryKeys.lists.detail(deletedListId),
            });
            queryClient.removeQueries({
              queryKey: queryKeys.cards.list(deletedListId),
            });
            break;

          // Checklist events
          case "checklist:created":
          case "checklist:updated": {
            const { checklist } = message.data;
            const cardIdForChecklist = checklist.cardId ?? checklist.card_id;
            console.log(`Checklist ${checklist.id} ${message.event}`);

            // Refresh checklist list for the card and checklist detail
            queryClient.invalidateQueries({
              queryKey: ["checklists", cardIdForChecklist],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", checklist.id],
            });
            break;
          }

          case "checklist:deleted": {
            const { checklistId, cardId } = message.data;
            console.log(`Checklist ${checklistId} deleted`);

            // Remove detail cache
            queryClient.removeQueries({
              queryKey: ["checklist", checklistId],
            });

            if (cardId) {
              queryClient.invalidateQueries({
                queryKey: ["checklists", cardId],
              });
            } else {
              // generic invalidation
              queryClient.invalidateQueries({
                queryKey: ["checklists"],
                exact: false,
              });
            }
            break;
          }

          default:
            console.log("Unknown WebSocket event:", message.event);
        }
      } catch (e) {
        console.error("Invalid WebSocket data:", e);
      }
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, queryClient]);
}

export function useRealtimeUpdates() {
  const { socket, isConnected } = useWebSocket();
  useWebSocketCardUpdates(socket);

  return { socket, isConnected };
}
