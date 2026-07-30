import { getNotificationTarget } from "./notification-list";
import { NotificationItem } from "@myTypes/notification";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: () => [],
}));

const baseNotification: NotificationItem = {
  id: "1",
  type: "info",
  title: "New item",
  message: null,
  cardId: null,
  listId: null,
  boardId: null,
  entityType: "notulensi",
  entityId: "note-1",
  workspaceId: "ws-1",
  createdBy: { id: "u-1", username: "john" },
  isRead: false,
  createdAt: "2026-07-29T10:00:00.000Z",
};

describe("getNotificationTarget", () => {
  it("routes notulensi notifications to detail page", () => {
    expect(getNotificationTarget(baseNotification)).toBe(
      "/workspace/ws-1/notulensi/note-1"
    );
  });

  it("routes card notifications to board page with optional query params", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        entityId: "card-1",
        boardId: "board-1",
        listId: "list-1",
        cardId: "card-1",
      })
    ).toBe("/workspace/ws-1/board/board-1?cardId=card-1&listId=list-1");
  });

  it("returns null for malformed payloads", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "notulensi",
        entityId: null,
      })
    ).toBeNull();

    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        boardId: null,
      })
    ).toBeNull();
  });
});
