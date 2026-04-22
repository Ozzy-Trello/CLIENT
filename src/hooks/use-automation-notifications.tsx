import { useEffect } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import {
  showAutomationToast,
  showBatchAutomationToast,
} from "@components/notifications/automation-toast";
import { queryKeys } from "@constants/query-keys";
import {
  BatchUpdateEvent,
  EnumBackendWebSocketEvent,
  WebSocketEventPayload,
} from "@myTypes/event";
import { Card } from "@myTypes/card";
import { ApiResponse } from "@myTypes/type";

const resolveCardName = (
  payload: WebSocketEventPayload,
  queryClient: QueryClient
): string | undefined => {
  const directName =
    (payload as any)?.card?.name ||
    (payload as any)?.card?.card_name ||
    (payload as any)?.card?.cardName ||
    (payload as any)?.cardName ||
    (payload as any)?.card_name;

  if (typeof directName === "string" && directName.trim()) {
    return directName.trim();
  }

  if (!payload.cardId) {
    return undefined;
  }

  const cachedCard = queryClient.getQueryData<ApiResponse<Card>>(
    queryKeys.cards.detail(payload.cardId)
  )?.data;

  const cachedName =
    cachedCard?.name ?? (cachedCard as any)?.card_name ?? (cachedCard as any)?.cardName;

  if (typeof cachedName === "string" && cachedName.trim()) {
    return cachedName.trim();
  }

  return undefined;
};

/**
 * Hook to show toast notifications when automation triggers produce websocket events.
 */
export function useAutomationNotifications(socket: WebSocket | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        const data = message.data as WebSocketEventPayload;

        if (data.triggeredBy !== "automation") {
          return;
        }

        // if (message.event === EnumBackendWebSocketEvent.BATCH_UPDATE) {
        //   const batchData = message.data as BatchUpdateEvent;
        //   showBatchAutomationToast(batchData.count);
        //   return;
        // }

        const importantEvents = [
          EnumBackendWebSocketEvent.CARD_MOVED,
          EnumBackendWebSocketEvent.CARD_CREATED,
          EnumBackendWebSocketEvent.CARD_ARCHIVED,
          EnumBackendWebSocketEvent.CARD_CUSTOM_FIELD_UPDATED,
        ];

        if (importantEvents.includes(message.event)) {
          showAutomationToast({
            cardId: data.cardId,
            cardName: resolveCardName(data, queryClient),
            actionType: data.metadata?.actionType,
            ruleId: data.metadata?.ruleId,
          });
        }
      } catch (error) {
        // Preserve application stability; logging is omitted intentionally.
      }
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, queryClient]);
}
