// client/src/store/notification_slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  NotificationCategory,
  NotificationItem,
  NotificationUnreadCounts,
} from "@myTypes/notification";

type NotificationTab = Exclude<NotificationCategory, "all">;

interface CategoryPayload<T> {
  category: NotificationCategory;
  value: T;
}

interface NotificationState {
  notificationsByCategory: Record<NotificationCategory, NotificationItem[]>;
  unreadCount: number;
  generalUnreadCount: number;
  commentUnreadCount: number;
  commentGateEnabled: boolean;
  totalByCategory: Record<NotificationCategory, number>;
  isOpen: boolean;
  activeTab: NotificationTab;
  isReviewingComment: boolean;
}

const initialState: NotificationState = {
  notificationsByCategory: {
    all: [],
    general: [],
    comment: [],
  },
  unreadCount: 0,
  generalUnreadCount: 0,
  commentUnreadCount: 0,
  commentGateEnabled: false,
  totalByCategory: {
    all: 0,
    general: 0,
    comment: 0,
  },
  isOpen: false,
  activeTab: "general",
  isReviewingComment: false,
};

const COMMENT_TYPES = new Set([
  "comment_mention",
  "notulensi_mention",
  "notulensi_comment",
  "mention",
]);

const getNotificationCategory = (notification: NotificationItem): NotificationTab =>
  COMMENT_TYPES.has(notification.type) ? "comment" : "general";

const getCategoryPayload = <T,>(
  payload: CategoryPayload<T> | T,
  fallbackCategory: NotificationCategory,
): CategoryPayload<T> => {
  if (
    payload &&
    typeof payload === "object" &&
    "category" in payload &&
    "value" in payload
  ) {
    return payload as CategoryPayload<T>;
  }

  return {
    category: fallbackCategory,
    value: payload as T,
  };
};

const markNotificationReadInList = (list: NotificationItem[], notificationId: string) => {
  const notification = list.find((item) => item.id === notificationId);
  if (!notification || notification.isRead) {
    return false;
  }

  notification.isRead = true;
  return true;
};

const notificationSlice = createSlice({
  name: "notificationState",
  initialState,
  reducers: {
    setNotifications(
      state,
      action: PayloadAction<CategoryPayload<NotificationItem[]> | NotificationItem[]>,
    ) {
      const { category, value } = getCategoryPayload(action.payload, state.activeTab);
      state.notificationsByCategory[category] = value;
    },
    appendNotifications(
      state,
      action: PayloadAction<CategoryPayload<NotificationItem[]> | NotificationItem[]>,
    ) {
      const { category, value } = getCategoryPayload(action.payload, state.activeTab);
      const existing = new Set(state.notificationsByCategory[category].map((item) => item.id));
      state.notificationsByCategory[category] = [
        ...state.notificationsByCategory[category],
        ...value.filter((item) => !existing.has(item.id)),
      ];
    },
    setNotificationTotal(state, action: PayloadAction<CategoryPayload<number> | number>) {
      const { category, value } = getCategoryPayload(action.payload, state.activeTab);
      state.totalByCategory[category] = value;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      const category = getNotificationCategory(action.payload);
      state.notificationsByCategory.all = [action.payload, ...state.notificationsByCategory.all].slice(0, 50);
      state.notificationsByCategory[category] = [
        action.payload,
        ...state.notificationsByCategory[category],
      ].slice(0, 50);
      state.totalByCategory.all += 1;
      state.totalByCategory[category] += 1;

      if (!action.payload.isRead) {
        state.unreadCount += 1;
        if (category === "comment") {
          state.commentUnreadCount += 1;
        } else {
          state.generalUnreadCount += 1;
        }
      }
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    setUnreadCounts(state, action: PayloadAction<NotificationUnreadCounts>) {
      state.unreadCount = action.payload.unreadCount;
      state.generalUnreadCount = action.payload.generalUnreadCount;
      state.commentUnreadCount = action.payload.commentUnreadCount;
      state.commentGateEnabled = action.payload.commentGateEnabled;
    },
    markAllReadLocally(state) {
      state.unreadCount = Math.max(0, state.unreadCount - state.generalUnreadCount);
      state.generalUnreadCount = 0;
      state.notificationsByCategory.general = state.notificationsByCategory.general.map((notification) => ({
        ...notification,
        isRead: true,
      }));
      state.notificationsByCategory.all = state.notificationsByCategory.all.map((notification) =>
        getNotificationCategory(notification) === "general"
          ? { ...notification, isRead: true }
          : notification,
      );
    },
    markNotificationReadLocally(state, action: PayloadAction<string>) {
      const notification = state.notificationsByCategory.all.find((item) => item.id === action.payload)
        || state.notificationsByCategory.general.find((item) => item.id === action.payload)
        || state.notificationsByCategory.comment.find((item) => item.id === action.payload);

      if (notification && !notification.isRead) {
        const category = getNotificationCategory(notification);
        markNotificationReadInList(state.notificationsByCategory.all, action.payload);
        markNotificationReadInList(state.notificationsByCategory[category], action.payload);
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        if (category === "comment") {
          state.commentUnreadCount = Math.max(0, state.commentUnreadCount - 1);
        } else {
          state.generalUnreadCount = Math.max(0, state.generalUnreadCount - 1);
        }
      }
    },
    setOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
    },
    setActiveTab(state, action: PayloadAction<NotificationTab>) {
      state.activeTab = action.payload;
    },
    setIsReviewingComment(state, action: PayloadAction<boolean>) {
      state.isReviewingComment = action.payload;
    },
  },
});

export const {
  setNotifications,
  appendNotifications,
  setNotificationTotal,
  addNotification,
  setUnreadCount,
  setUnreadCounts,
  markAllReadLocally,
  markNotificationReadLocally,
  setOpen,
  setActiveTab,
  setIsReviewingComment,
} = notificationSlice.actions;

export default notificationSlice.reducer;

// Selectors — use optional chaining because notificationState is blacklisted from
// redux-persist and may be undefined during the initial rehydration phase.
const getNotificationState = (state: { notificationState?: NotificationState }) =>
  state.notificationState;

export const selectNotifications = (state: { notificationState?: NotificationState }) => {
  const notificationState = getNotificationState(state);
  return notificationState?.notificationsByCategory[notificationState.activeTab] ?? [];
};
export const selectNotificationsByCategory = (
  state: { notificationState?: NotificationState },
  category: NotificationCategory,
) => getNotificationState(state)?.notificationsByCategory[category] ?? [];
export const selectUnreadCount = (state: { notificationState?: NotificationState }) =>
  getNotificationState(state)?.unreadCount ?? 0;
export const selectGeneralUnreadCount = (state: { notificationState?: NotificationState }) =>
  getNotificationState(state)?.generalUnreadCount ?? 0;
export const selectCommentUnreadCount = (state: { notificationState?: NotificationState }) =>
  getNotificationState(state)?.commentUnreadCount ?? 0;
export const selectCommentGateEnabled = (state: { notificationState?: NotificationState }) =>
  getNotificationState(state)?.commentGateEnabled ?? false;
export const selectNotificationTotal = (state: { notificationState?: NotificationState }) => {
  const notificationState = getNotificationState(state);
  return notificationState?.totalByCategory[notificationState.activeTab] ?? 0;
};
export const selectNotificationTotalByCategory = (
  state: { notificationState?: NotificationState },
  category: NotificationCategory,
) => getNotificationState(state)?.totalByCategory[category] ?? 0;
export const selectNotificationOpen = (state: { notificationState?: NotificationState }) =>
  getNotificationState(state)?.isOpen ?? false;
export const selectNotificationActiveTab = (state: { notificationState?: NotificationState }) =>
  getNotificationState(state)?.activeTab ?? "general";
export const selectIsReviewingComment = (state: { notificationState?: NotificationState }) =>
  getNotificationState(state)?.isReviewingComment ?? false;
