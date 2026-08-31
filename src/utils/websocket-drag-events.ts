import {
  EnumBackendWebSocketEvent,
  EnumUserActionEvent,
} from "@myTypes/event";

const EVENTS_ALLOWED_DURING_DRAG = new Set<string>([
  "automation:label_added",
  "automation:label_removed",
  "notification:new",
  EnumUserActionEvent.CardMoved,
  EnumBackendWebSocketEvent.CARD_MOVED,
  EnumBackendWebSocketEvent.CARD_UPDATED,
]);

export const shouldProcessWebSocketEventDuringDrag = (eventType: string) =>
  EVENTS_ALLOWED_DURING_DRAG.has(eventType);
