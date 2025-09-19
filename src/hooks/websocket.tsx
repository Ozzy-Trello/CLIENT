import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import camelcaseKeys from "camelcase-keys";
import { EnumUserActionEvent } from "@myTypes/event";
import { queryKeys } from "@constants/query-keys";

// Custom hook to manage WebSocket connection
export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Make sure the WebSocket URL is correctly formatted
    const wsUrl =
      process.env.NEXT_PUBLIC_BE_BASE_URL?.replace("http", "ws") + "/ws";

    const ws = new WebSocket(wsUrl);
    setConnectionAttempts((prev) => prev + 1);

    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
      setLastError(null);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      setIsConnected(false);
      setLastError(`WebSocket error at ${new Date().toISOString()}`);
    };

    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        setLastError("Connection timeout");
      }
    }, 10000); // 10 second timeout

    ws.onopen = (event) => {
      clearTimeout(connectionTimeout);
      setIsConnected(true);
      setSocket(ws);
      setLastError(null);
    };

    return () => {
      clearTimeout(connectionTimeout);
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };
  }, []);

  return { socket, isConnected, connectionAttempts, lastError };
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

        // Don't process WebSocket updates during drag operations to prevent re-renders
        if ((window as any).__DRAG_IN_PROGRESS__) {
          return;
        }

        let refreshDashcard = false;
        switch (message.event) {
          case "connection":
            break;

          case EnumUserActionEvent.CardMoved:
            const { card, fromListId, toListId } = message.data;

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
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.CardUpdated:
            const { card: updatedCard, listId } = message.data;

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(listId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(updatedCard.id),
            });
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.CardRenamed:
            const {
              card: renamedCard,
              listId: renamedListId,
              previousName,
              renamedBy,
            } = message.data;

            // Invalidate relevant queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(renamedListId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(renamedCard.id),
            });
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.CardCreated:
            const { card: newCard, listId: newCardListId } = message.data;

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(newCardListId),
            });
            // Dashcard counters may be affected (new card)
            queryClient.invalidateQueries({
              queryKey: ["dashcardCount"],
              exact: false,
            });
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.CardDeleted:
            const { cardId: deletedCardId, listId: deletedCardListId } =
              message.data;

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(deletedCardListId),
            });
            // Remove the specific card from cache
            queryClient.removeQueries({
              queryKey: queryKeys.cards.detail(deletedCardId),
            });
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.CardArchived:
            const { card: archivedCard } = message.data;

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
            refreshDashcard = true;
            break;

          case "additional_field:updated": {
            const {
              cardId,
              additionalFieldId,
              updatedItem,
              action,
              newStatus,
              scannedCount,
              totalCount,
            } = message.data;

            // Invalidate additional field queries to refresh the UI
            queryClient.invalidateQueries({
              queryKey: ["additionalFields", cardId],
            });

            // Also invalidate card detail to refresh any related displays
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            break;
          }

          case "card_activity:added": {
            const { cardId, activity } = message.data;

            // Invalidate card detail to refresh activity feed
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate card activities queries
            queryClient.invalidateQueries({
              queryKey: ["cardActivities"],
              exact: false,
            });

            break;
          }

          case "card_member:updated": {
            const { cardId, members } = message.data;

            // Invalidate card members queries
            queryClient.invalidateQueries({
              queryKey: ["cardMembers"],
              exact: false,
            });

            // Also invalidate card detail to refresh member display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            break;
          }

          case EnumUserActionEvent.ListCreated:
            const {
              list: createdList,
              boardId: createdBoardId,
              createdBy,
            } = message.data;

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
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.ListMoved:
            const {
              list: movedList,
              boardId: movedBoardId,
              previousPosition,
              targetPosition,
              movedBy,
            } = message.data;

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
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.ListUpdated:
            const { list: updatedList, boardId: updatedBoardId } = message.data;

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
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.ListDeleted:
            const { listId: deletedListId, boardId: deletedBoardId } =
              message.data;

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
            refreshDashcard = true;
            break;

          // Checklist events
          case "checklist:created":
          case "checklist:updated": {
            const { checklist } = message.data;
            const cardIdForChecklist = checklist.cardId ?? checklist.card_id;

            // Refresh checklist list for the card and checklist detail
            queryClient.invalidateQueries({
              queryKey: ["checklists", cardIdForChecklist],
            });
            queryClient.invalidateQueries({
              queryKey: ["checklist", checklist.id],
            });
            refreshDashcard = true;
            break;
          }

          case "checklist:deleted": {
            const { checklistId, cardId } = message.data;

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
            refreshDashcard = true;
            break;
          }

          case "card_member:updated": {
            const { cardId, members } = message.data;
            // invalidate any member-related queries
            queryClient.invalidateQueries({
              queryKey: ["cardMembers", cardId],
            });
            // also refresh card detail so member list in sidebar updates
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });
            refreshDashcard = true;
            break;
          }

          case "card_activity:added": {
            const { cardId, activity } = message.data;

            // Invalidate the card activity query to refresh the activity list
            queryClient.invalidateQueries({
              queryKey: ["cardActivity", cardId],
            });

            // Also invalidate card detail to ensure any activity-related UI updates
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            break;
          }

          case "card_attachment:updated": {
            const { cardId } = message.data;
            queryClient.invalidateQueries({
              queryKey: ["cardAttachment", cardId],
            });
            break;
          }

          case "card_label:added": {
            const { cardId, labelId, label, workspaceId, addedBy } =
              message.data;

            // Invalidate card labels queries
            queryClient.invalidateQueries({
              queryKey: ["cardLabels", workspaceId, cardId],
            });
            queryClient.invalidateQueries({
              queryKey: ["labels", workspaceId],
            });

            // Also invalidate card detail to refresh label display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Label changes might affect dashcard filtering/counting
            refreshDashcard = true;
            break;
          }

          case "card_label:removed": {
            const { cardId, labelId } = message.data;

            // Invalidate card labels queries
            queryClient.invalidateQueries({
              queryKey: ["cardLabels"],
              exact: false,
            });
            queryClient.invalidateQueries({
              queryKey: ["labels"],
              exact: false,
            });

            // Also invalidate card detail to refresh label display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Label changes might affect dashcard filtering/counting
            refreshDashcard = true;
            break;
          }

          case "label:created": {
            const { label, workspaceId } = message.data;

            // Invalidate labels queries
            queryClient.invalidateQueries({
              queryKey: ["labels", workspaceId],
            });
            queryClient.invalidateQueries({
              queryKey: ["allLabels", workspaceId],
            });

            break;
          }

          case "label:updated": {
            const { label, workspaceId } = message.data;

            // Invalidate labels queries
            queryClient.invalidateQueries({
              queryKey: ["labels", workspaceId],
            });
            queryClient.invalidateQueries({
              queryKey: ["allLabels", workspaceId],
            });

            break;
          }

          case "label:deleted": {
            const { labelId, workspaceId } = message.data;

            // Invalidate labels queries
            queryClient.invalidateQueries({
              queryKey: ["labels", workspaceId],
            });
            queryClient.invalidateQueries({
              queryKey: ["allLabels", workspaceId],
            });

            break;
          }

          case "card_labels:removed_all": {
            const { cardId } = message.data;

            // Invalidate card labels queries
            queryClient.invalidateQueries({
              queryKey: ["cardLabels"],
              exact: false,
            });
            queryClient.invalidateQueries({
              queryKey: ["labels"],
              exact: false,
            });

            // Also invalidate card detail to refresh label display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Label changes might affect dashcard filtering/counting
            refreshDashcard = true;
            break;
          }

          case "automation:rule_triggered": {
            const {
              ruleId,
              cardId,
              cardName,
              triggerType,
              actionCount,
              triggeredBy,
              workspaceId,
            } = message.data;

            // Invalidate card detail to refresh any automation-related changes
            if (cardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.detail(cardId),
              });
            }

            // Invalidate card labels queries to refresh label changes
            queryClient.invalidateQueries({
              queryKey: ["cardLabels"],
              exact: false,
            });

            // Invalidate custom fields queries to refresh field changes
            queryClient.invalidateQueries({
              queryKey: ["customFields"],
              exact: false,
            });

            // Automation can change card properties that affect dashcards
            refreshDashcard = true;
            break;
          }

          case "automation:label_added": {
            const { cardId, labelId, automationRuleId, triggeredBy, addedBy } =
              message.data;

            // Invalidate card labels queries
            queryClient.invalidateQueries({
              queryKey: ["cardLabels"],
              exact: false,
            });
            queryClient.invalidateQueries({
              queryKey: ["labels"],
              exact: false,
            });

            // Also invalidate card detail to refresh label display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Automation label changes affect dashcards
            refreshDashcard = true;
            break;
          }

          case "automation:label_removed": {
            const { cardId, labelId, automationRuleId, triggeredBy } =
              message.data;

            // Invalidate card labels queries
            queryClient.invalidateQueries({
              queryKey: ["cardLabels"],
              exact: false,
            });
            queryClient.invalidateQueries({
              queryKey: ["labels"],
              exact: false,
            });

            // Also invalidate card detail to refresh label display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Automation label changes affect dashcards
            refreshDashcard = true;
            break;
          }

          case "custom_field:updated": {
            const { customField, cardId, workspaceId } = message.data;

            // Invalidate custom fields queries
            queryClient.invalidateQueries({
              queryKey: ["customFields"],
              exact: false,
            });

            // Invalidate card custom fields queries
            queryClient.invalidateQueries({
              queryKey: ["cardCustomFields"],
              exact: false,
            });

            // Also invalidate card detail to refresh custom field display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate workspace custom fields if workspaceId is provided
            if (workspaceId) {
              queryClient.invalidateQueries({
                queryKey: ["customFields", workspaceId],
              });
            }

            // Custom field changes affect dashcard calculations
            refreshDashcard = true;
            break;
          }

          case "card_activity:added": {
            const { cardId, activity } = message.data;

            // Invalidate card detail to refresh activity feed
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate card activities queries
            queryClient.invalidateQueries({
              queryKey: ["cardActivities"],
              exact: false,
            });

            break;
          }

          case "dashboard:updated": {
            const { cardId, dashcardConfig, workspaceId } = message.data;

            // Invalidate dashcard-related queries
            if (cardId) {
              queryClient.invalidateQueries({
                queryKey: ["dashcardCount", cardId],
              });
              queryClient.invalidateQueries({
                queryKey: ["list-dashcard", cardId, workspaceId],
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.detail(cardId),
              });
            }

            // Also invalidate general dashcard queries
            queryClient.invalidateQueries({
              queryKey: ["dashcardCount"],
              exact: false,
            });

            refreshDashcard = true;
            break;
          }

          case "board_favorite:toggled": {
            const { userId, boardId, isFavorite } = message.data;
            console.log(
              "[FAVORITE LOGS] WebSocket board_favorite:toggled received (ignored real-time):",
              { userId, boardId, isFavorite }
            );

            // Real-time favorite updates are disabled per requirement.
            // We rely on explicit refetches after user actions instead.
            break;
          }

          case "board_favorite:order_updated": {
            const { userId, favoriteOrders } = message.data;

            // Invalidate user board order query to refresh sidebar order
            queryClient.invalidateQueries({
              queryKey: ["userBoardOrder", userId],
            });
            // Also invalidate boards list to ensure consistent ordering
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.all,
            });
            break;
          }

          default:
            break;
        }

        if (refreshDashcard) {
          queryClient.invalidateQueries({
            queryKey: ["dashcardCount"],
            exact: false,
          });
          queryClient.invalidateQueries({
            queryKey: ["list-dashcard"],
            exact: false,
          });
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
