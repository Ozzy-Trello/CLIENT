import reducer, {
  appendNotifications,
  markNotificationReadLocally,
  setNotifications,
  setNotificationTotal,
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

describe("appendNotifications", () => {
  it("appends new notifications without duplicating existing ids", () => {
    let state = reducer(undefined, setNotifications([notification("1", false)]));
    state = reducer(state, appendNotifications([
      notification("2", false),
      notification("1", false),
      notification("3", false),
    ]));

    expect(state.notifications.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("keeps total unchanged", () => {
    let state = reducer(undefined, setNotificationTotal(25));
    state = reducer(state, appendNotifications([notification("2", false)]));

    expect(state.total).toBe(25);
  });
});

describe("setNotificationTotal", () => {
  it("sets the total number of notifications", () => {
    const state = reducer(undefined, setNotificationTotal(42));

    expect(state.total).toBe(42);
  });
});
