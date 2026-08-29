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
  commentUnreadGroupCount: number;
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
  commentUnreadGroupCount: 0,
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

const normalizeNotification = (notification: NotificationItem): NotificationItem => ({
  ...notification,
  groupId: notification.groupId || notification.id,
  groupCount: Math.max(1, Number(notification.groupCount) || 1),
});

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
      state.notificationsByCategory[category] = value.map(normalizeNotification);
    },
    appendNotifications(
      state,
      action: PayloadAction<CategoryPayload<NotificationItem[]> | NotificationItem[]>,
    ) {
      const { category, value } = getCategoryPayload(action.payload, state.activeTab);
      const existing = new Set(state.notificationsByCategory[category].map((item) =>
        category === "comment" ? item.groupId || item.id : item.id
      ));
      state.notificationsByCategory[category] = [
        ...state.notificationsByCategory[category],
        ...value.map(normalizeNotification).filter((item) =>
          !existing.has(category === "comment" ? item.groupId || item.id : item.id)
        ),
      ];
    },
    setNotificationTotal(state, action: PayloadAction<CategoryPayload<number> | number>) {
      const { category, value } = getCategoryPayload(action.payload, state.activeTab);
      state.totalByCategory[category] = value;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      const notification = normalizeNotification(action.payload);
      const category = getNotificationCategory(notification);
      const isDuplicateEvent = [
        ...state.notificationsByCategory.all,
        ...state.notificationsByCategory[category],
      ].some((item) => item.id === notification.id);
      if (isDuplicateEvent) return;
      const commentList = state.notificationsByCategory.comment;
      const existingCommentGroup = category === "comment"
        ? commentList.find((item) => (item.groupId || item.id) === notification.groupId)
        : undefined;
      const mergeIntoList = (list: NotificationItem[]) => {
        if (category !== "comment") {
          return [notification, ...list].slice(0, 50);
        }
        const existingIndex = list.findIndex(
          (item) => getNotificationCategory(item) === "comment" &&
            (item.groupId || item.id) === notification.groupId,
        );
        if (existingIndex === -1) {
          return [notification, ...list].slice(0, 50);
        }
        const existing = list[existingIndex];
        const merged = {
          ...notification,
          groupCount: Math.max(existing.groupCount, notification.groupCount),
          isRead: notification.isRead && existing.isRead,
        };
        return [merged, ...list.filter((_, index) => index !== existingIndex)].slice(0, 50);
      };
      const isNewGroup = category !== "comment" || (
        !existingCommentGroup
        && (notification.groupCount === 1 || state.totalByCategory.comment <= commentList.length)
      );
      state.notificationsByCategory.all = mergeIntoList(state.notificationsByCategory.all);
      state.notificationsByCategory[category] = mergeIntoList(
        state.notificationsByCategory[category],
      );
      state.totalByCategory.all += 1;
      if (isNewGroup) {
        state.totalByCategory[category] += 1;
      }

      if (!action.payload.isRead) {
        state.unreadCount += 1;
        if (category === "comment") {
          state.commentUnreadCount += 1;
          if (isNewGroup) state.commentUnreadGroupCount += 1;
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
      state.commentUnreadGroupCount = action.payload.commentUnreadGroupCount;
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
        if (category === "comment") {
          const groupId = notification.groupId || notification.id;
          const unreadEvents = Math.max(1, notification.groupCount || 1);
          const matchesGroup = (item: NotificationItem) =>
            getNotificationCategory(item) === "comment" && (item.groupId || item.id) === groupId;
          for (const listCategory of ["all", "comment"] as const) {
            state.notificationsByCategory[listCategory].forEach((item) => {
              if (matchesGroup(item)) item.isRead = true;
            });
          }
          state.unreadCount = Math.max(0, state.unreadCount - unreadEvents);
          state.commentUnreadCount = Math.max(0, state.commentUnreadCount - unreadEvents);
          state.commentUnreadGroupCount = Math.max(0, state.commentUnreadGroupCount - 1);
          return;
        }
        markNotificationReadInList(state.notificationsByCategory.all, action.payload);
        markNotificationReadInList(state.notificationsByCategory[category], action.payload);
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        state.generalUnreadCount = Math.max(0, state.generalUnreadCount - 1);
      }
    },
    markNotificationGroupReadLocally(
      state,
      action: PayloadAction<{ groupId: string; groupCount?: number }>,
    ) {
      const { groupId } = action.payload;
      const matchesGroup = (item: NotificationItem) =>
        getNotificationCategory(item) === "comment" && (item.groupId || item.id) === groupId;
      const representative = state.notificationsByCategory.comment.find(matchesGroup)
        || state.notificationsByCategory.all.find(matchesGroup);
      if (!representative || representative.isRead) return;

      const unreadEvents = Math.max(
        1,
        action.payload.groupCount || representative.groupCount || 1,
      );
      for (const category of ["all", "comment"] as const) {
        state.notificationsByCategory[category].forEach((item) => {
          if (matchesGroup(item)) item.isRead = true;
        });
      }
      state.unreadCount = Math.max(0, state.unreadCount - unreadEvents);
      state.commentUnreadCount = Math.max(0, state.commentUnreadCount - unreadEvents);
      state.commentUnreadGroupCount = Math.max(0, state.commentUnreadGroupCount - 1);
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
  markNotificationGroupReadLocally,
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
export const selectCommentUnreadGroupCount = (state: { notificationState?: NotificationState }) =>
  getNotificationState(state)?.commentUnreadGroupCount ?? 0;
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
