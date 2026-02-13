import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import camelcaseKeys from "camelcase-keys";
import {
  BatchUpdateEvent,
  EnumBackendWebSocketEvent,
  EnumUserActionEvent,
  WebSocketEventPayload,
} from "@myTypes/event";
import { queryKeys } from "@constants/query-keys";
import { useAutomationNotifications } from "@hooks/use-automation-notifications";
import {
  handleBatchUpdate,
  handleBoardUpdated,
  handleCardAttachmentEvent,
  handleCardCompletionChanged,
  handleCardCopied,
  handleCardDateUpdated,
  handleCardMemberEvent,
  handleCardMoved,
  handleCardUnarchived,
  handleChecklistItemEvent,
  handleCustomFieldCleared,
  handleCustomFieldUpdated,
  handleListArchived,
} from "@utils/websocket-event-handlers";

/**
 * Tracks recent frontend mutations to avoid processing websocket echoes
 * that would lead to duplicate invalidations.
 */
const recentMutationsSet = new Set<string>();
const MUTATION_EXPIRY_MS = 3000; // 3 seconds

/**
 * Register a mutation so that websocket handlers can skip redundant invalidations.
 */
export function registerMutation(eventType: string, entityId: string) {
  const key = `${eventType}:${entityId}`;
  recentMutationsSet.add(key);
  setTimeout(() => recentMutationsSet.delete(key), MUTATION_EXPIRY_MS);
}

/**
 * Check if an entity was mutated recently from this client.
 */
export function wasRecentlyMutated(eventType: string, entityId: string): boolean {
  return recentMutationsSet.has(`${eventType}:${entityId}`);
}

/**
 * Normalize the backend URL to the corresponding websocket protocol.
 */
function toWebSocketUrl(baseUrl: string) {
  if (baseUrl.startsWith("https://")) {
    return baseUrl.replace("https://", "wss://");
  }
  if (baseUrl.startsWith("http://")) {
    return baseUrl.replace("http://", "ws://");
  }
  return baseUrl;
}

/**
 * Create and track the shared websocket connection to the backend.
 * @returns connection state required by realtime hooks/components.
 */
export function useWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BE_BASE_URL;

    if (!baseUrl) {
      console.error("[WS] NEXT_PUBLIC_BE_BASE_URL is not defined");
      setLastError("Missing backend URL");
      return;
    }

    const wsUrl = `${toWebSocketUrl(baseUrl)}/ws`;
    console.log("[WS] Connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    setConnectionAttempts((prev) => prev + 1);

    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.error("[WS] Connection timeout");
        ws.close();
        setLastError("WebSocket connection timeout");
      }
    }, 10000);

    ws.onopen = () => {
      console.log("[WS] Connected");
      clearTimeout(timeout);
      setIsConnected(true);
      setLastError(null);
    };

    ws.onclose = (event) => {
      console.warn("[WS] Closed", {
        code: event.code,
        reason: event.reason,
      });
      setIsConnected(false);
      socketRef.current = null;
    };

    ws.onerror = (event) => {
      console.error("[WS] Error", event);
      setIsConnected(false);
      setLastError("WebSocket error");
    };

    return () => {
      clearTimeout(timeout);
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionAttempts,
    lastError,
  };
}

/**
 * Subscribe to websocket updates and keep React Query caches in sync.
 * @param socket active websocket connection or null while disconnected.
 */
export function useWebSocketCardUpdates(socket: WebSocket | null) {
  const queryClient = useQueryClient();
  // Dashcard invalidation disabled for performance; refs kept for cleanup compatibility.
  const dashcardTimeoutRef = useRef<any>(null);
  const dashcardLastInvalidatedRef = useRef<number>(0);
  const DASHCARD_INTERVAL_MS = 180000; // 3 minutes throttle

  const scheduleDashcardInvalidation = () => {
    const now = Date.now();
    const elapsed = now - dashcardLastInvalidatedRef.current;

    if (elapsed >= DASHCARD_INTERVAL_MS) {
      queryClient.invalidateQueries({
        queryKey: ["dashcardCount"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["list-dashcard"],
        exact: false,
      });
      dashcardLastInvalidatedRef.current = now;
      return;
    }

    if (!dashcardTimeoutRef.current) {
      dashcardTimeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["dashcardCount"],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["list-dashcard"],
          exact: false,
        });
        dashcardLastInvalidatedRef.current = Date.now();
        dashcardTimeoutRef.current = null;
      }, DASHCARD_INTERVAL_MS - elapsed);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        let message = JSON.parse(event.data);
        message = camelcaseKeys(message, { deep: true });

        // Don't process most WebSocket updates during drag operations to prevent re-renders
        // Allow label automation events so labels stay in sync without refresh.
        if ((window as any).__DRAG_IN_PROGRESS__) {
          const allowDuringDrag = new Set([
            "automation:label_added",
            "automation:label_removed",
            EnumUserActionEvent.CardMoved,
            EnumBackendWebSocketEvent.CARD_MOVED,
            EnumBackendWebSocketEvent.CARD_UPDATED,
          ]);
          if (!allowDuringDrag.has(message.event)) {
            return;
          }
        }

        let refreshDashcard = false;
        switch (message.event) {
          case "connection":
            break;

          case EnumUserActionEvent.CardMoved:
            const { card, fromListId, toListId, boardId } = message.data;

            // Skip if this was our own move (prevent processing our own mutation)
            if (wasRecentlyMutated("card:moved", card.id)) {
              console.log("[WS] Skipping own card move", card.id);
              break;
            }

            // CRITICAL FIX: Explicitly remove card from source list cache
            // This prevents ghost cards when automation moves cards
            queryClient.setQueryData(
              queryKeys.cards.list(fromListId),
              (old: any) => {
                if (!old?.data) return old;
                return {
                  ...old,
                  data: old.data.filter((c: any) => c.id !== card.id),
                };
              }
            );

            // Add moved card to destination cache immediately so board state updates in real time.
            if (toListId && card) {
              queryClient.setQueryData(
                queryKeys.cards.list(toListId),
                (old: any) => {
                  const movedCard = {
                    ...card,
                    listId: toListId,
                    list_id: toListId,
                  };
                  if (!old?.data) {
                    return { ...old, data: [movedCard] };
                  }
                  const withoutExisting = old.data.filter(
                    (c: any) => c.id !== card.id
                  );
                  return {
                    ...old,
                    data: [movedCard, ...withoutExisting],
                  };
                }
              );
            }

            // Invalidate only the affected lists, not all lists
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
            // Invalidate board-specific list queries if boardId is provided
            if (boardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.lists.board(boardId),
              });
            }
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.CardUpdated:
            const { card: updatedCard, listId } = message.data;

            // Invalidate only affected queries - removed lists.all for performance
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

            // Invalidate only affected queries - removed lists.all for performance
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(renamedListId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(renamedCard.id),
            });
            refreshDashcard = true;
            break;

          case EnumUserActionEvent.CardCreated:
            console.log("[WebSocket] CardCreated event received:", message.data);
            const { card: newCard, listId: newCardListId } = message.data;

            // Invalidate only the affected list - removed lists.all for performance
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(newCardListId),
              refetchType: "all",
            });
            // Skip dashcard invalidation to reduce churn
            break;

          case EnumUserActionEvent.CardDeleted:
            const { cardId: deletedCardId, listId: deletedCardListId } =
              message.data;

            // Invalidate only the affected list - removed lists.all for performance
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

            // Get the correct listId (handle both camelCase and snake_case)
            const archiveListId = archivedCard.listId || archivedCard.list_id;

            // Invalidate only affected queries - removed lists.all for performance
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

            // Skip if this was just mutated by us (prevents double invalidation)
            if (wasRecentlyMutated("label:added", `${cardId}:${labelId}`)) {
              break;
            }

            // Only invalidate specific queries for this card/workspace
            // Removed card detail invalidation - labels are already optimistically updated
            if (workspaceId && cardId) {
              queryClient.invalidateQueries({
                queryKey: ["cardLabels", workspaceId, cardId],
              });
            }
            if (workspaceId) {
              queryClient.invalidateQueries({
                queryKey: ["labels", workspaceId],
                exact: false, // Allow partial match for labels with params
              });
            }

            // Skip dashcard refresh for label changes - too expensive
            break;
          }

          case "card_label:removed": {
            const { cardId, labelId, workspaceId } = message.data;

            // Skip if this was just mutated by us (prevents double invalidation)
            if (wasRecentlyMutated("label:removed", `${cardId}:${labelId}`)) {
              break;
            }

            // Only invalidate specific queries for this card/workspace
            // FIXED: Use specific keys instead of exact: false which invalidated ALL labels
            if (workspaceId && cardId) {
              queryClient.invalidateQueries({
                queryKey: ["cardLabels", workspaceId, cardId],
              });
            }
            if (workspaceId) {
              queryClient.invalidateQueries({
                queryKey: ["labels", workspaceId],
                exact: false, // Allow partial match for labels with params
              });
            }

            // Skip dashcard refresh for label changes - too expensive
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
            const { cardId, workspaceId } = message.data;

            // Only invalidate specific queries for this card
            // FIXED: Use specific keys instead of exact: false which invalidated ALL labels
            if (workspaceId && cardId) {
              queryClient.invalidateQueries({
                queryKey: ["cardLabels", workspaceId, cardId],
              });
            } else if (cardId) {
              // Fallback: invalidate card labels matching this cardId
              queryClient.invalidateQueries({
                predicate: (query) => {
                  const key = query.queryKey;
                  return key[0] === "cardLabels" && key[2] === cardId;
                },
              });
            }
            if (workspaceId) {
              queryClient.invalidateQueries({
                queryKey: ["labels", workspaceId],
                exact: false,
              });
            }

            // Skip dashcard refresh for label changes - too expensive
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

            // Use targeted invalidation with workspaceId if available
            if (workspaceId && cardId) {
              queryClient.invalidateQueries({
                queryKey: ["cardLabels", workspaceId, cardId],
              });
              queryClient.invalidateQueries({
                queryKey: ["cardCustomFields", cardId],
              });
              queryClient.invalidateQueries({
                queryKey: ["customFields", workspaceId],
              });
            }

            // Automation can change card properties that affect dashcards
            refreshDashcard = true;
            break;
          }

          case "automation:label_added": {
            const { cardId, labelId, automationRuleId, triggeredBy, addedBy, workspaceId, listId, boardId } =
              message.data;

            console.log("[LABEL LOG] 📨 automation:label_added received", {
              cardId,
              labelId,
              listId,
              boardId,
              willInvalidateDetail: !!cardId,
              willInvalidateList: !!listId,
              willInvalidateBoard: !!boardId
            });

            // Invalidate card detail so label appears on card
            if (cardId) {
              console.log("[LABEL LOG] Invalidating card detail:", queryKeys.cards.detail(cardId));
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.detail(cardId),
              });
            }

            // Invalidate list cards so label appears in list view
            if (listId) {
              console.log("[LABEL LOG] Invalidating list cards:", queryKeys.cards.list(listId));
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(listId),
              });
            }

            // Invalidate board lists
            if (boardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.lists.board(boardId),
              });
            }

            // Only invalidate specific queries for this card
            if (workspaceId && cardId) {
              queryClient.invalidateQueries({
                queryKey: ["cardLabels", workspaceId, cardId],
              });
            } else if (cardId) {
              queryClient.invalidateQueries({
                predicate: (query) => {
                  const key = query.queryKey;
                  return key[0] === "cardLabels" && key[2] === cardId;
                },
              });
            }
            if (workspaceId) {
              queryClient.invalidateQueries({
                queryKey: ["labels", workspaceId],
                exact: false,
              });
            }

            refreshDashcard = true;
            break;
          }

          case "automation:label_removed": {
            const { cardId, labelId, automationRuleId, triggeredBy, workspaceId, listId, boardId } =
              message.data;

            console.log("[LABEL LOG] 📨 automation:label_removed received", {
              cardId,
              labelId,
              listId,
              boardId,
              willInvalidateDetail: !!cardId,
              willInvalidateList: !!listId,
              willInvalidateBoard: !!boardId
            });

            // Invalidate card detail so label removal appears on card
            if (cardId) {
              console.log("[LABEL LOG] Invalidating card detail:", queryKeys.cards.detail(cardId));
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.detail(cardId),
              });
            }

            // Invalidate list cards so label removal appears in list view
            if (listId) {
              console.log("[LABEL LOG] Invalidating list cards:", queryKeys.cards.list(listId));
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(listId),
              });
            }

            // Invalidate board lists
            if (boardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.lists.board(boardId),
              });
            }

            // Only invalidate specific queries for this card
            if (workspaceId && cardId) {
              queryClient.invalidateQueries({
                queryKey: ["cardLabels", workspaceId, cardId],
              });
            } else if (cardId) {
              queryClient.invalidateQueries({
                predicate: (query) => {
                  const key = query.queryKey;
                  return key[0] === "cardLabels" && key[2] === cardId;
                },
              });
            }
            if (workspaceId) {
              queryClient.invalidateQueries({
                queryKey: ["labels", workspaceId],
                exact: false,
              });
            }

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

          // Backward compatibility: backend emits 'dashcard:updated'
          // Ensure we invalidate the same queries as 'dashboard:updated'
          case "dashcard:updated": {
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

          // Sales Order related events
          case "sales_order:created": {
            const { cardId, salesOrderData, listId } = message.data;

            // Invalidate card detail to refresh SO information
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate list cards to refresh card display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.list(listId),
            });

            // Invalidate lists to refresh any list-level aggregations
            queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });

            refreshDashcard = true;
            break;
          }

          case "custom_field:updated": {
            const { cardId, customFieldId, fieldName, value, listId, workspaceId, boardId } = message.data;

            // Invalidate card detail to refresh custom field display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate card custom fields with specific keys
            queryClient.invalidateQueries({
              queryKey: ["cardCustomFields", cardId],
            });

            if (workspaceId) {
              queryClient.invalidateQueries({
                queryKey: ["cardCustomField", cardId, workspaceId],
              });
              // Invalidate workspace custom fields
              queryClient.invalidateQueries({
                queryKey: ["customFields", workspaceId],
              });
            }

            // Invalidate list cards to refresh any custom field displays in card lists
            if (listId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(listId),
              });
            } else {
              // Fallback for legacy payloads missing listId.
              queryClient.invalidateQueries({
                predicate: (query) =>
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === "cards" &&
                  query.queryKey[1] === "list",
              });
            }

            // Use board-specific invalidation instead of lists.all
            if (boardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.lists.board(boardId),
              });
            }

            refreshDashcard = true;
            break;
          }

          case "card_attachment:updated": {
            const { cardId, attachmentUrl, source, listId } = message.data;

            // Invalidate card detail to refresh attachment display
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
            });

            // Invalidate card attachments
            queryClient.invalidateQueries({
              queryKey: ["cardAttachment", cardId],
            });

            // Invalidate list cards to refresh any attachment indicators
            if (listId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(listId),
              });
            }

            refreshDashcard = true;
            break;
          }

          // Handle automation-triggered events (board.card.* format)
          case EnumBackendWebSocketEvent.CARD_CREATED: {
            const { cardId, listId, boardId, workspaceId } = message.data;
            console.log("[WS] 🤖 board.card.created event:", { cardId, listId, boardId, triggeredBy: message.data?.triggeredBy });

            // Invalidate list cards to show the new card
            if (listId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(listId),
                refetchType: "all",
              });
            }
            // Invalidate board lists
            if (boardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.lists.board(boardId),
              });
            }
            refreshDashcard = true;
            break;
          }

          case EnumBackendWebSocketEvent.CARD_ARCHIVED: {
            const { cardId, listId, boardId } = message.data;
            console.log("[WS] 🤖 board.card.archived event:", { cardId, listId, boardId, triggeredBy: message.data?.triggeredBy });

            // Invalidate list cards to remove the archived card
            if (listId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(listId),
              });
            }
            // Invalidate card detail
            if (cardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.detail(cardId),
              });
            }
            // Invalidate archived cards query
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.archived(),
            });
            // Invalidate board lists
            if (boardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.lists.board(boardId),
              });
            }
            refreshDashcard = true;
            break;
          }

          case EnumBackendWebSocketEvent.CARD_UPDATED: {
            const { cardId, listId, boardId } = message.data;
            console.log("[WS] 🤖 board.card.updated event:", { cardId, listId, boardId, triggeredBy: message.data?.triggeredBy });

            // Invalidate card detail
            if (cardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.detail(cardId),
              });
            }
            // Invalidate list cards
            if (listId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(listId),
              });
            }
            // Invalidate board lists
            if (boardId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.lists.board(boardId),
              });
            }
            refreshDashcard = true;
            break;
          }

          case EnumBackendWebSocketEvent.CARD_CHECKLIST_ADDED: {
            const { cardId, listId, boardId } = message.data;
            console.log("[WS] 🤖 board.card.checklist.added event:", { cardId, triggeredBy: message.data?.triggeredBy });

            // Invalidate checklist queries for this card
            if (cardId) {
              queryClient.invalidateQueries({
                queryKey: ["checklists", cardId],
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.detail(cardId),
              });
            }
            // Invalidate list cards
            if (listId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.cards.list(listId),
              });
            }
            refreshDashcard = true;
            break;
          }

          case EnumBackendWebSocketEvent.CARD_MOVED:
            handleCardMoved(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_UNARCHIVED:
            handleCardUnarchived(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_COPIED:
            handleCardCopied(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_CUSTOM_FIELD_UPDATED:
            handleCustomFieldUpdated(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_CUSTOM_FIELD_CLEARED:
            handleCustomFieldCleared(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_CHECKLIST_ITEM_CHECKED:
          case EnumBackendWebSocketEvent.CARD_CHECKLIST_ITEM_UNCHECKED:
          case EnumBackendWebSocketEvent.CARD_CHECKLIST_ITEM_ADDED:
          case EnumBackendWebSocketEvent.CARD_CHECKLIST_ITEM_REMOVED:
            handleChecklistItemEvent(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_MEMBER_ADDED:
          case EnumBackendWebSocketEvent.CARD_MEMBER_REMOVED:
            handleCardMemberEvent(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_ATTACHMENT_ADDED:
          case EnumBackendWebSocketEvent.CARD_ATTACHMENT_REMOVED:
            handleCardAttachmentEvent(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.LIST_ARCHIVED:
            handleListArchived(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.BOARD_UPDATED:
            handleBoardUpdated(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_DATE_UPDATED:
            handleCardDateUpdated(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.CARD_COMPLETION_CHANGED:
            handleCardCompletionChanged(
              queryClient,
              message.data as WebSocketEventPayload
            );
            refreshDashcard = true;
            break;

          case EnumBackendWebSocketEvent.BATCH_UPDATE:
            handleBatchUpdate(
              queryClient,
              message.data as BatchUpdateEvent
            );
            refreshDashcard = true;
            break;

          default:
            break;
        }

        // triggeredBy tells us whether the server sent this as automation vs user action.
        // For automation events, we perform comprehensive invalidation to ensure UI stays in sync
        if (message.data?.triggeredBy === "automation") {
          console.log(
            "[WS] 🤖 Automation event received:",
            {
              event: message.event,
              cardId: message.data?.cardId,
              boardId: message.data?.boardId,
              listId: message.data?.listId,
              ruleId: message.data?.metadata?.ruleId,
              actionType: message.data?.metadata?.actionType,
            }
          );

          // Always invalidate affected card, list, and board queries for automation events
          // This ensures UI stays in sync without requiring manual refresh
          const { cardId, listId, boardId, workspaceId } = message.data;

          if (cardId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.cards.detail(cardId),
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
            queryClient.invalidateQueries({
              queryKey: queryKeys.boards.detail(boardId),
            });
          }

          // Force dashcard refresh for automation events
          refreshDashcard = true;
        }

        if (refreshDashcard) {
          scheduleDashcardInvalidation();
        }
      } catch (e) {
        console.error("Invalid WebSocket data:", e);
      }
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
      if (dashcardTimeoutRef.current) {
        clearTimeout(dashcardTimeoutRef.current);
        dashcardTimeoutRef.current = null;
      }
    };
  }, [socket, queryClient]);
}

/**
 * Bundle websocket connection state, cache updates, and automation notifications.
 */
export function useRealtimeUpdates() {
  const { socket, isConnected } = useWebSocket();
  useWebSocketCardUpdates(socket);
  useAutomationNotifications(socket);

  return { socket, isConnected };
}
