import { api } from ".";
import { NotificationsResponse } from "@myTypes/notification";

export const getNotifications = async (
  page = 1,
  limit = 20
): Promise<NotificationsResponse> => {
  const res = await api.get("/notifications", { params: { page, limit } });
  return res.data;
};

export const getUnreadCount = async (): Promise<{ unreadCount: number }> => {
  const res = await api.get("/notifications/count");
  return res.data;
};

export const markAllRead = async (): Promise<void> => {
  await api.patch("/notifications/read");
};

