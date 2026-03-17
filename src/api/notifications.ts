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

export const getVapidPublicKey = async (): Promise<{ publicKey: string }> => {
  const res = await api.get("/notifications/vapid-public-key");
  return res.data;
};

export const subscribePush = async (subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> => {
  await api.post("/notifications/push-subscription", subscription);
};

export const unsubscribePush = async (endpoint: string): Promise<void> => {
  await api.delete("/notifications/push-subscription", { data: { endpoint } });
};
