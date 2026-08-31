import { shouldProcessWebSocketEventDuringDrag } from "./websocket-drag-events";

describe("shouldProcessWebSocketEventDuringDrag", () => {
  it("keeps notification events so realtime lists do not become stale", () => {
    expect(shouldProcessWebSocketEventDuringDrag("notification:new")).toBe(true);
  });

  it("continues suppressing unrelated events during drag", () => {
    expect(shouldProcessWebSocketEventDuringDrag("card:deleted")).toBe(false);
  });
});
