import { WebSocketEventPayload } from "@myTypes/event";

/**
 * Simulate a websocket event for manual QA/testing.
 */
export function simulateWebSocketEvent(
  eventType: string,
  data: WebSocketEventPayload
) {
  if (typeof window === "undefined") {
    console.warn("[WS Test] simulateWebSocketEvent is browser-only");
    return;
  }
  const event = new MessageEvent("message", {
    data: JSON.stringify({
      event: eventType,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  window.dispatchEvent(new CustomEvent("ws-test-event", { detail: event }));

  console.log("[WS Test] Simulated event:", eventType, data);
}

if (typeof window !== "undefined") {
  (window as any).simulateWebSocketEvent = simulateWebSocketEvent;
}
