import reducer, {
  addNotification,
  appendNotifications,
  markAllReadLocally,
  markNotificationGroupReadLocally,
  markNotificationReadLocally,
  setActiveTab,
  setNotifications,
  setNotificationTotal,
  setUnreadCounts,
} from "./notification_slice";

const notification = (id: string, isRead: boolean, type = "info") => ({
  id,
  groupId: id,
  groupCount: 1,
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
      setUnreadCounts({ unreadCount: 1, generalUnreadCount: 1, commentUnreadCount: 0, commentUnreadGroupCount: 0, commentGateEnabled: true })
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
      setUnreadCounts({ unreadCount: 1, generalUnreadCount: 0, commentUnreadCount: 1, commentUnreadGroupCount: 1, commentGateEnabled: true })
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

  it("deduplicates comment pages by group ID when the representative changes", () => {
    const first = { ...notification("first", false, "comment_mention"), groupId: "card-1" };
    const latest = { ...notification("latest", false, "comment_mention"), groupId: "card-1" };
    let state = reducer(undefined, setNotifications({ category: "comment", value: [first] }));

    state = reducer(state, appendNotifications({ category: "comment", value: [latest] }));

    expect(state.notificationsByCategory.comment).toHaveLength(1);
    expect(state.notificationsByCategory.comment[0].id).toBe("first");
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
      setUnreadCounts({ unreadCount: 2, generalUnreadCount: 1, commentUnreadCount: 1, commentUnreadGroupCount: 1, commentGateEnabled: true })
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
    state = reducer(state, addNotification(notification("notulensi-comment-1", false, "notulensi_comment")));
    state = reducer(state, addNotification(notification("card-description-1", false, "mention")));

    expect(state.unreadCount).toBe(4);
    expect(state.generalUnreadCount).toBe(1);
    expect(state.commentUnreadCount).toBe(3);
    expect(state.commentUnreadGroupCount).toBe(3);
    expect(state.notificationsByCategory.general[0].id).toBe("general-1");
    expect(state.notificationsByCategory.comment.map((item) => item.id)).toEqual([
      "card-description-1",
      "notulensi-comment-1",
      "comment-1",
    ]);
  });

  it("merges new comment events into their existing group", () => {
    const first = { ...notification("first", false, "comment_mention"), groupId: "card-1", groupCount: 2 };
    const latest = { ...notification("latest", false, "comment_mention"), groupId: "card-1", groupCount: 3 };
    let state = reducer(undefined, addNotification(first));
    state = reducer(state, addNotification(latest));

    expect(state.notificationsByCategory.comment).toHaveLength(1);
    expect(state.notificationsByCategory.comment[0]).toMatchObject({ id: "latest", groupCount: 3 });
    expect(state.totalByCategory.comment).toBe(1);
    expect(state.commentUnreadCount).toBe(2);
    expect(state.commentUnreadGroupCount).toBe(1);
  });

  it("ignores duplicate websocket notification events", () => {
    const event = { ...notification("event-1", false, "comment_mention"), groupId: "card-1", groupCount: 2 };
    let state = reducer(undefined, addNotification(event));
    state = reducer(state, addNotification(event));

    expect(state.notificationsByCategory.comment).toHaveLength(1);
    expect(state.notificationsByCategory.comment[0].groupCount).toBe(2);
    expect(state.unreadCount).toBe(1);
    expect(state.commentUnreadCount).toBe(1);
  });
});

describe("markNotificationGroupReadLocally", () => {
  it("marks the group and decrements raw and grouped counts once", () => {
    const grouped = { ...notification("latest", false, "comment_mention"), groupId: "card-1", groupCount: 3, unreadCount: 3 };
    let state = reducer(undefined, setNotifications({ category: "comment", value: [grouped] }));
    state = reducer(state, setUnreadCounts({
      unreadCount: 5,
      generalUnreadCount: 2,
      commentUnreadCount: 3,
      commentUnreadGroupCount: 1,
      commentGateEnabled: true,
    }));
    state = reducer(state, markNotificationGroupReadLocally({ groupId: "card-1", unreadCount: 3 }));
    state = reducer(state, markNotificationGroupReadLocally({ groupId: "card-1", unreadCount: 3 }));

    expect(state.notificationsByCategory.comment[0].isRead).toBe(true);
    expect(state.unreadCount).toBe(2);
    expect(state.commentUnreadCount).toBe(0);
    expect(state.commentUnreadGroupCount).toBe(0);
  });
});

describe("setActiveTab", () => {
  it("tracks the active notification tab", () => {
    const state = reducer(undefined, setActiveTab("comment"));

    expect(state.activeTab).toBe("comment");
  });
});
