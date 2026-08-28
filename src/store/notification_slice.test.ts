import reducer, {
  addNotification,
  appendNotifications,
  markAllReadLocally,
  markNotificationReadLocally,
  setActiveTab,
  setNotifications,
  setNotificationTotal,
  setUnreadCounts,
} from "./notification_slice";

const notification = (id: string, isRead: boolean, type = "info") => ({
  id,
  type,
  title: id,
  message: null,
  activityId: type === "comment_mention" ? `activity-${id}` : null,
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
    let state = reducer(
      undefined,
      setNotifications({ category: "general", value: [notification("1", false)] })
    );
    state = reducer(
      state,
      setNotifications({ category: "all", value: [notification("1", false)] })
    );
    state = reducer(
      state,
      setUnreadCounts({ unreadCount: 1, generalUnreadCount: 1, commentUnreadCount: 0, commentGateEnabled: true })
    );
    state = reducer(state, markNotificationReadLocally("1"));
    state = reducer(state, markNotificationReadLocally("1"));

    expect(state.notificationsByCategory.general[0].isRead).toBe(true);
    expect(state.unreadCount).toBe(0);
    expect(state.generalUnreadCount).toBe(0);
  });

  it("decrements comment counts for comment mentions", () => {
    let state = reducer(undefined, setNotifications({ category: "comment", value: [notification("1", false, "comment_mention")] }));
    state = reducer(state, setNotifications({ category: "all", value: [notification("1", false, "comment_mention")] }));
    state = reducer(
      state,
      setUnreadCounts({ unreadCount: 1, generalUnreadCount: 0, commentUnreadCount: 1, commentGateEnabled: true })
    );

    state = reducer(state, markNotificationReadLocally("1"));

    expect(state.commentUnreadCount).toBe(0);
    expect(state.unreadCount).toBe(0);
  });

  it("does not decrement for a missing item and clamps at zero", () => {
    let state = reducer(undefined, setNotifications({ category: "general", value: [notification("1", false)] }));
    state = reducer(state, markNotificationReadLocally("missing"));
    state = reducer(state, markNotificationReadLocally("1"));

    expect(state.unreadCount).toBe(0);
  });
});

describe("appendNotifications", () => {
  it("appends new notifications without duplicating existing ids", () => {
    let state = reducer(
      undefined,
      setNotifications({ category: "general", value: [notification("1", false)] })
    );
    state = reducer(
      state,
      appendNotifications({
        category: "general",
        value: [notification("2", false), notification("1", false), notification("3", false)],
      })
    );

    expect(state.notificationsByCategory.general.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("keeps total unchanged", () => {
    let state = reducer(undefined, setNotificationTotal({ category: "general", value: 25 }));
    state = reducer(
      state,
      appendNotifications({ category: "general", value: [notification("2", false)] })
    );

    expect(state.totalByCategory.general).toBe(25);
  });
});

describe("setNotificationTotal", () => {
  it("sets the total number of notifications", () => {
    const state = reducer(undefined, setNotificationTotal({ category: "comment", value: 42 }));

    expect(state.totalByCategory.comment).toBe(42);
  });
});

describe("markAllReadLocally", () => {
  it("clears only general unread notifications", () => {
    let state = reducer(undefined, setNotifications({ category: "all", value: [notification("general-1", false), notification("comment-1", false, "comment_mention")] }));
    state = reducer(state, setNotifications({ category: "general", value: [notification("general-1", false)] }));
    state = reducer(state, setNotifications({ category: "comment", value: [notification("comment-1", false, "comment_mention")] }));
    state = reducer(
      state,
      setUnreadCounts({ unreadCount: 2, generalUnreadCount: 1, commentUnreadCount: 1, commentGateEnabled: true })
    );

    state = reducer(state, markAllReadLocally());

    expect(state.unreadCount).toBe(1);
    expect(state.generalUnreadCount).toBe(0);
    expect(state.commentUnreadCount).toBe(1);
    expect(state.notificationsByCategory.general[0].isRead).toBe(true);
    expect(state.notificationsByCategory.comment[0].isRead).toBe(false);
  });
});

describe("addNotification", () => {
  it("increments category-specific unread counts", () => {
    let state = reducer(undefined, addNotification(notification("general-1", false)));
    state = reducer(state, addNotification(notification("comment-1", false, "comment_mention")));

    expect(state.unreadCount).toBe(2);
    expect(state.generalUnreadCount).toBe(1);
    expect(state.commentUnreadCount).toBe(1);
    expect(state.notificationsByCategory.general[0].id).toBe("general-1");
    expect(state.notificationsByCategory.comment[0].id).toBe("comment-1");
  });
});

describe("setActiveTab", () => {
  it("tracks the active notification tab", () => {
    const state = reducer(undefined, setActiveTab("comment"));

    expect(state.activeTab).toBe("comment");
  });
});
