export type NotificationCategory = "all" | "general" | "comment";

export const NOTIFICATION_NEW_EVENT = "notification:new";

export interface NotificationItem {
  id: string;
  groupId: string;
  groupCount: number;
  unreadCount: number;
  type: string;
  title: string;
  message: string | null;
  activityId: string | null;
  cardId: string | null;
  listId: string | null;
  boardId: string | null;
  entityType: string;
  entityId: string | null;
  workspaceId: string;
  createdBy: {
    id: string;
    username: string;
  };
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  total: number;
  unreadCount: number;
}

export interface NotificationUnreadCounts {
  unreadCount: number;
  generalUnreadCount: number;
  commentUnreadCount: number;
  commentUnreadGroupCount: number;
  commentGateEnabled: boolean;
}

export interface MarkNotificationGroupReadResponse
  extends Omit<NotificationUnreadCounts, "commentGateEnabled"> {
  success: boolean;
  commentGateEnabled?: boolean;
}
