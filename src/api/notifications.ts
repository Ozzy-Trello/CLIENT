import { api } from ".";
import {
  NotificationCategory,
  NotificationsResponse,
  NotificationUnreadCounts,
} from "@myTypes/notification";

export const getNotifications = async (
  page = 1,
  limit = 20,
  category: NotificationCategory = "all"
): Promise<NotificationsResponse> => {
  const res = await api.get("/notifications", { params: { page, limit, category } });
  return res.data;
};

export const getUnreadCount = async (): Promise<NotificationUnreadCounts> => {
  const res = await api.get("/notifications/count");
  return {
    unreadCount: Number(res.data.unreadCount) || 0,
    generalUnreadCount:
      Number(res.data.generalUnreadCount) || Number(res.data.unreadCount) || 0,
    commentUnreadCount: Number(res.data.commentUnreadCount) || 0,
    commentGateEnabled: res.data.commentGateEnabled === true,
  };
};

export const markAllRead = async (): Promise<void> => {
  await api.patch("/notifications/read");
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await api.patch(`/notifications/${encodeURIComponent(notificationId)}/read`);
};
