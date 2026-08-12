import reducer, {
  markNotificationReadLocally,
  setNotifications,
  setUnreadCount,
} from "./notification_slice";

const notification = (id: string, isRead: boolean) => ({
  id,
  type: "info",
  title: id,
  message: null,
  cardId: null,
  listId: null,
  boardId: null,
  entityType: "card",
  entityId: null,
  workspaceId: "workspace-1",
  createdBy: { id: "user-1", username: "User" },
  isRead,
  createdAt: "2026-07-29T10:00:00.000Z",
});

describe("markNotificationReadLocally", () => {
  it("marks a found unread item and decrements once", () => {
    let state = reducer(undefined, setNotifications([notification("1", false)]));
    state = reducer(state, setUnreadCount(1));
    state = reducer(state, markNotificationReadLocally("1"));
    state = reducer(state, markNotificationReadLocally("1"));

    expect(state.notifications[0].isRead).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it("does not decrement for a missing item and clamps at zero", () => {
    let state = reducer(undefined, setNotifications([notification("1", false)]));
    state = reducer(state, markNotificationReadLocally("missing"));
    state = reducer(state, markNotificationReadLocally("1"));

    expect(state.unreadCount).toBe(0);
  });
});
