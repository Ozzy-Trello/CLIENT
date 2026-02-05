import { useEffect } from "react";
import { showAutomationToast, showBatchAutomationToast } from "@components/notifications/automation-toast";
import {
  BatchUpdateEvent,
  EnumBackendWebSocketEvent,
  WebSocketEventPayload,
} from "@myTypes/event";

/**
 * Hook to show toast notifications when automation triggers produce websocket events.
 */
export function useAutomationNotifications(socket: WebSocket | null) {
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        const data = message.data as WebSocketEventPayload;

        if (data.triggeredBy !== "automation") {
          return;
        }

        if (message.event === EnumBackendWebSocketEvent.BATCH_UPDATE) {
          const batchData = message.data as BatchUpdateEvent;
          showBatchAutomationToast(batchData.count);
          return;
        }

        const importantEvents = [
          EnumBackendWebSocketEvent.CARD_MOVED,
          EnumBackendWebSocketEvent.CARD_CREATED,
          EnumBackendWebSocketEvent.CARD_ARCHIVED,
          EnumBackendWebSocketEvent.CARD_CUSTOM_FIELD_UPDATED,
        ];

        if (importantEvents.includes(message.event)) {
          showAutomationToast({
            cardId: data.cardId,
            cardName: (data as any).card?.name || (data as any).cardName,
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
  }, [socket]);
}
