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

        let refreshDashcard = false;
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
            refreshDashcard = true;
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
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.CardRenamed:
            const {
              card: renamedCard,
              listId: renamedListId,
              previousName,
              renamedBy,
            } = message.data;
            console.log(
              `Card ${renamedCard.id} renamed from "${previousName}" to "${renamedCard.name}" in list ${renamedListId} by ${renamedBy}`
            );

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
            console.log(
              `New card ${newCard.id} created in list ${newCardListId}`
            );

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
            refreshDashcard = true;
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
            refreshDashcard = true;
            break;

          case "additional_field:updated": {
            const { cardId, additionalFieldId, updatedItem, action, newStatus, scannedCount, totalCount } = message.data;
            console.log(`Additional field updated for card ${cardId}`, {
              additionalFieldId,
              updatedItem,
              action,
              newStatus,
              scannedCount,
              totalCount,
            });

            // Invalidate additional field queries to refresh the UI
            queryClient.invalidateQueries({
              queryKey: ["additionalFields", cardId],
            });

            // Also invalidate card detail to refresh any related displays
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            console.log("Invalidated additional field queries for card:", cardId);
            break;
          }

          case "custom_field:updated": {
            const { customField, cardId, workspaceId } = message.data;
            console.log(`Custom field updated for card ${cardId}`, {
              customFieldId: customField?.custom_field_id,
              workspaceId,
            });

            // Invalidate custom field queries
            queryClient.invalidateQueries({
              queryKey: ["customFields", workspaceId, cardId],
            });
            queryClient.invalidateQueries({
              queryKey: ["customField", workspaceId, cardId],
            });

            // Also invalidate card detail to refresh custom field display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            console.log("Invalidated custom field queries for card:", cardId);
            break;
          }

          case "card_activity:added": {
            const { cardId, activity } = message.data;
            console.log(`Card activity added for card ${cardId}`, {
              activity,
            });

            // Invalidate card detail to refresh activity feed
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate card activities queries
            queryClient.invalidateQueries({
              queryKey: ["cardActivities"],
              exact: false,
            });

            console.log("Invalidated card activity queries for card:", cardId);
            break;
          }

          case "card_member:updated": {
            const { cardId, members } = message.data;
            console.log(`Card members updated for card ${cardId}`, {
              members,
            });

            // Invalidate card members queries
            queryClient.invalidateQueries({
              queryKey: ["cardMembers"],
              exact: false,
            });

            // Also invalidate card detail to refresh member display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            console.log("Invalidated card member queries for card:", cardId);
            break;
          }

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
            refreshDashcard = true;
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
            refreshDashcard = true;
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
            refreshDashcard = true;
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
            refreshDashcard = true;
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
            refreshDashcard = true;
            break;
          }

          case "card_member:updated": {
            const { cardId, members } = message.data;
            console.log(`Members updated for card ${cardId}`);
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
            console.log(`Card activity added for card ${cardId}`, activity);

            // Invalidate the card activity query to refresh the activity list
            queryClient.invalidateQueries({
              queryKey: ["cardActivity", cardId],
            });

            // Also invalidate card detail to ensure any activity-related UI updates
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            console.log("Invalidated card activity queries for card:", cardId);
            break;
          }

          case "card_attachment:updated": {
            const { cardId } = message.data;
            console.log(`Card attachments updated for card ${cardId}`);
            queryClient.invalidateQueries({
              queryKey: ["cardAttachment", cardId],
            });
            console.log(
              "Invalidated card attachment queries for card:",
              cardId
            );
            break;
          }

          case "card_label:added": {
            const { cardId, labelId, label, workspaceId, addedBy } =
              message.data;
            console.log(
              `Label ${labelId} added to card ${cardId} by ${addedBy}`
            );

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

            console.log("Invalidated card label queries for card:", cardId);
            break;
          }

          case "card_label:removed": {
            const { cardId, labelId } = message.data;
            console.log(`Label ${labelId} removed from card ${cardId}`);

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

            console.log("Invalidated card label queries for card:", cardId);
            break;
          }

          case "label:created": {
            const { label, workspaceId } = message.data;
            console.log(
              `Label ${label.id} created in workspace ${workspaceId}`
            );

            // Invalidate labels queries
            queryClient.invalidateQueries({
              queryKey: ["labels", workspaceId],
            });
            queryClient.invalidateQueries({
              queryKey: ["allLabels", workspaceId],
            });

            console.log(
              "Invalidated label queries for workspace:",
              workspaceId
            );
            break;
          }

          case "label:updated": {
            const { label, workspaceId } = message.data;
            console.log(
              `Label ${label.id} updated in workspace ${workspaceId}`
            );

            // Invalidate labels queries
            queryClient.invalidateQueries({
              queryKey: ["labels", workspaceId],
            });
            queryClient.invalidateQueries({
              queryKey: ["allLabels", workspaceId],
            });

            console.log(
              "Invalidated label queries for workspace:",
              workspaceId
            );
            break;
          }

          case "label:deleted": {
            const { labelId, workspaceId } = message.data;
            console.log(
              `Label ${labelId} deleted from workspace ${workspaceId}`
            );

            // Invalidate labels queries
            queryClient.invalidateQueries({
              queryKey: ["labels", workspaceId],
            });
            queryClient.invalidateQueries({
              queryKey: ["allLabels", workspaceId],
            });

            console.log(
              "Invalidated label queries for workspace:",
              workspaceId
            );
            break;
          }

          case "card_labels:removed_all": {
            const { cardId } = message.data;
            console.log(`All labels removed from card ${cardId}`);

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

            console.log("Invalidated card label queries for card:", cardId);
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
            console.log(
              `Automation rule ${ruleId} triggered for card ${cardId} (${cardName})`,
              {
                triggerType,
                actionCount,
                triggeredBy,
                workspaceId,
              }
            );

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

            console.log(
              "Invalidated queries for automation rule triggered:",
              ruleId
            );
            break;
          }

          case "automation:label_added": {
            const { cardId, labelId, automationRuleId, triggeredBy, addedBy } =
              message.data;
            console.log(`Automation added label ${labelId} to card ${cardId}`, {
              automationRuleId,
              triggeredBy,
              addedBy,
            });

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

            console.log(
              "Invalidated card label queries for automation label added:",
              cardId
            );
            break;
          }

          case "automation:label_removed": {
            const { cardId, labelId, automationRuleId, triggeredBy } =
              message.data;
            console.log(
              `Automation removed label ${labelId} from card ${cardId}`,
              {
                automationRuleId,
                triggeredBy,
              }
            );

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

            console.log(
              "Invalidated card label queries for automation label removed:",
              cardId
            );
            break;
          }

          case "custom_field:updated": {
            const { customField, cardId, workspaceId } = message.data;
            console.log(
              `Custom field ${customField?.id} updated for card ${cardId}`,
              {
                customField,
                workspaceId,
              }
            );

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

            console.log("Invalidated custom field queries for card:", cardId);
            break;
          }

          case "card_activity:added": {
            const { cardId, activity } = message.data;
            console.log(`Card activity added for card ${cardId}`, {
              activity,
            });

            // Invalidate card detail to refresh activity feed
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate card activities queries
            queryClient.invalidateQueries({
              queryKey: ["cardActivities"],
              exact: false,
            });

            console.log("Invalidated card activity queries for card:", cardId);
            break;
          }

          default:
            console.log("Unknown WebSocket event:", message.event);
        }

        if (refreshDashcard) {
          queryClient.invalidateQueries({
            queryKey: ["dashcardCount"],
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
