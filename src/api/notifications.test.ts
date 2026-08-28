import { api } from ".";
import { getNotifications, getUnreadCount, markNotificationRead } from "./notifications";

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
        commentGateEnabled: true,
      },
    });

    await expect(getUnreadCount()).resolves.toEqual({
      unreadCount: 5,
      generalUnreadCount: 3,
      commentUnreadCount: 2,
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
      commentGateEnabled: false,
    });
  });

  it("marks one notification read", async () => {
    (api.patch as jest.Mock).mockResolvedValue({});

    await markNotificationRead("notification/1");

    expect(api.patch).toHaveBeenCalledWith("/notifications/notification%2F1/read");
  });
});
