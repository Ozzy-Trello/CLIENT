export type NotificationCategory = "all" | "general" | "comment";

export interface NotificationItem {
  id: string;
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
  commentGateEnabled: boolean;
}
