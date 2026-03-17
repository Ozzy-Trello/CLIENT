export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  cardId: string;
  listId: string;
  boardId: string;
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
