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

  it("routes card notifications using canonical entity ID", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        entityId: "canonical-card",
        boardId: "board-1",
        listId: "list-1",
        cardId: "legacy-card",
      })
    ).toBe("/workspace/ws-1/board/board-1?cardId=canonical-card&listId=list-1");
  });

  it("falls back to the legacy card ID", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        entityId: null,
        boardId: "board-1",
        cardId: "legacy-card",
      })
    ).toBe("/workspace/ws-1/board/board-1?cardId=legacy-card");
  });

  it("omits a missing list ID", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        entityId: "card-1",
        boardId: "board-1",
        listId: null,
      })
    ).toBe("/workspace/ws-1/board/board-1?cardId=card-1");
  });

  it("encodes path and query IDs", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        workspaceId: "workspace/a",
        entityType: "card",
        entityId: "card & one",
        boardId: "board/a",
        listId: "list & one",
      })
    ).toBe(
      "/workspace/workspace%2Fa/board/board%2Fa?cardId=card+%26+one&listId=list+%26+one"
    );

    expect(
      getNotificationTarget({
        ...baseNotification,
        workspaceId: "workspace/a",
        entityId: "note/a",
      })
    ).toBe("/workspace/workspace%2Fa/notulensi/note%2Fa");
  });

  it("does not route unsupported entities with board fields", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "product",
        entityId: "product-1",
        boardId: "board-1",
        cardId: "card-1",
      })
    ).toBeNull();
  });

  it.each([null, "", " ", "null", "undefined"])(
    "rejects malformed required ID %p",
    (invalidId) => {
      expect(
        getNotificationTarget({
          ...baseNotification,
          workspaceId: invalidId as string,
        })
      ).toBeNull();

      expect(
        getNotificationTarget({
          ...baseNotification,
          entityType: "card",
          entityId: invalidId,
          cardId: invalidId,
          boardId: "board-1",
        })
      ).toBeNull();

      expect(
        getNotificationTarget({
          ...baseNotification,
          entityType: "card",
          entityId: "card-1",
          boardId: invalidId,
        })
      ).toBeNull();
    }
  );

  it("returns null when notulensi or card IDs are missing", () => {
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
        entityId: "card-1",
        boardId: null,
      })
    ).toBeNull();
  });
});
