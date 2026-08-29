import { api } from ".";
import {
  getNotificationGroupItems,
  getNotifications,
  getUnreadCount,
  markNotificationGroupRead,
  markNotificationRead,
} from "./notifications";

jest.mock(".", () => ({ api: { get: jest.fn(), patch: jest.fn() } }));

describe("notifications api", () => {
  it("fetches notifications with category params", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [], total: 0, unreadCount: 0 } });

    await getNotifications(2, 10, "comment");

    expect(api.get).toHaveBeenCalledWith("/notifications", {
      params: { page: 2, limit: 10, category: "comment" },
    });
  });

  it("fetches canonical unread counts", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        unreadCount: 5,
        generalUnreadCount: 3,
        commentUnreadCount: 2,
        commentUnreadGroupCount: 1,
        commentGateEnabled: true,
      },
    });

    await expect(getUnreadCount()).resolves.toEqual({
      unreadCount: 5,
      generalUnreadCount: 3,
      commentUnreadCount: 2,
      commentUnreadGroupCount: 1,
      commentGateEnabled: true,
    });
    expect(api.get).toHaveBeenCalledWith("/notifications/count");
  });

  it("fails open against the legacy count response", async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { unreadCount: 5 } });

    await expect(getUnreadCount()).resolves.toEqual({
      unreadCount: 5,
      generalUnreadCount: 5,
      commentUnreadCount: 0,
      commentUnreadGroupCount: 0,
      commentGateEnabled: false,
    });
  });

  it("preserves an explicit zero general unread count", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        unreadCount: 5,
        generalUnreadCount: 0,
        commentUnreadCount: 5,
        commentUnreadGroupCount: 1,
        commentGateEnabled: true,
      },
    });

    await expect(getUnreadCount()).resolves.toMatchObject({
      unreadCount: 5,
      generalUnreadCount: 0,
      commentUnreadCount: 5,
    });
  });

  it("fetches and normalizes legacy group items", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { data: [{ id: "item-1" }], total: 1 },
    });

    await expect(getNotificationGroupItems("group/1", 2, 10)).resolves.toMatchObject({
      data: [{ id: "item-1", groupId: "item-1", groupCount: 1 }],
      total: 1,
    });
    expect(api.get).toHaveBeenCalledWith("/notifications/groups/group%2F1/items", {
      params: { page: 2, limit: 10 },
    });
  });

  it("marks a whole group read and normalizes counts", async () => {
    (api.patch as jest.Mock).mockResolvedValue({ data: {
      success: true,
      unreadCount: 4,
      generalUnreadCount: 2,
      commentUnreadCount: 2,
      commentUnreadGroupCount: 1,
    } });

    await expect(markNotificationGroupRead("group/1")).resolves.toMatchObject({
      success: true,
      commentUnreadGroupCount: 1,
    });
    expect(api.patch).toHaveBeenCalledWith("/notifications/groups/group%2F1/read");
  });

  it("marks one notification read", async () => {
    (api.patch as jest.Mock).mockResolvedValue({});

    await markNotificationRead("notification/1");

    expect(api.patch).toHaveBeenCalledWith("/notifications/notification%2F1/read");
  });
});
