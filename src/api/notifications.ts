import { api } from ".";
import {
  MarkNotificationGroupReadResponse,
  NotificationCategory,
  NotificationItem,
  NotificationsResponse,
  NotificationUnreadCounts,
} from "@myTypes/notification";

export const normalizeNotification = (
  notification: Omit<NotificationItem, "groupId" | "groupCount" | "unreadCount"> &
    Partial<Pick<NotificationItem, "groupId" | "groupCount" | "unreadCount">>,
): NotificationItem => ({
  ...notification,
  groupId: notification.groupId || notification.id,
  groupCount: Math.max(1, Number(notification.groupCount) || 1),
  unreadCount: Math.max(0, Number(notification.unreadCount) || 0),
});

export const getNotifications = async (
  page = 1,
  limit = 20,
  category: NotificationCategory = "all"
): Promise<NotificationsResponse> => {
  const res = await api.get("/notifications", { params: { page, limit, category } });
  return {
    ...res.data,
    data: (res.data.data || []).map(normalizeNotification),
  };
};

export const getNotificationGroupItems = async (
  groupId: string,
  page = 1,
  limit = 20,
): Promise<{ data: NotificationItem[]; total: number }> => {
  const res = await api.get(
    `/notifications/groups/${encodeURIComponent(groupId)}/items`,
    { params: { page, limit } },
  );
  return {
    ...res.data,
    data: (res.data.data || []).map(normalizeNotification),
  };
};

export const getUnreadCount = async (): Promise<NotificationUnreadCounts> => {
  const res = await api.get("/notifications/count");
  const hasGeneralUnreadCount = res.data.generalUnreadCount !== undefined
    && res.data.generalUnreadCount !== null;
  return {
    unreadCount: Number(res.data.unreadCount) || 0,
    generalUnreadCount: hasGeneralUnreadCount
      ? Number(res.data.generalUnreadCount) || 0
      : Number(res.data.unreadCount) || 0,
    commentUnreadCount: Number(res.data.commentUnreadCount) || 0,
    commentUnreadGroupCount: Number(res.data.commentUnreadGroupCount) || 0,
    commentGateEnabled: res.data.commentGateEnabled === true,
  };
};

export const markAllRead = async (): Promise<void> => {
  await api.patch("/notifications/read");
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await api.patch(`/notifications/${encodeURIComponent(notificationId)}/read`);
};

export const markNotificationGroupRead = async (
  groupId: string,
): Promise<MarkNotificationGroupReadResponse> => {
  const res = await api.patch(`/notifications/groups/${encodeURIComponent(groupId)}/read`);
  return {
    success: res.data.success === true,
    unreadCount: Number(res.data.unreadCount) || 0,
    generalUnreadCount: Number(res.data.generalUnreadCount) || 0,
    commentUnreadCount: Number(res.data.commentUnreadCount) || 0,
    commentUnreadGroupCount: Number(res.data.commentUnreadGroupCount) || 0,
    commentGateEnabled: res.data.commentGateEnabled,
  };
};
