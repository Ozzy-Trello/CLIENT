// client/src/store/notification_slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NotificationItem } from "@myTypes/notification";

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isOpen: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isOpen: false,
};

const notificationSlice = createSlice({
  name: "notificationState",
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<NotificationItem[]>) {
      state.notifications = action.payload;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      // Prepend new notification, keep list bounded to 50
      state.notifications = [action.payload, ...state.notifications].slice(0, 50);
      state.unreadCount += 1;
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    markAllReadLocally(state) {
      state.unreadCount = 0;
      state.notifications = state.notifications.map((n) => ({ ...n, isRead: true }));
    },
    markNotificationReadLocally(state, action: PayloadAction<string>) {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    setOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  setUnreadCount,
  markAllReadLocally,
  markNotificationReadLocally,
  setOpen,
} = notificationSlice.actions;

export default notificationSlice.reducer;

// Selectors — use optional chaining because notificationState is blacklisted from
// redux-persist and may be undefined during the initial rehydration phase.
export const selectNotifications = (state: { notificationState?: NotificationState }) =>
  state.notificationState?.notifications ?? [];
export const selectUnreadCount = (state: { notificationState?: NotificationState }) =>
  state.notificationState?.unreadCount ?? 0;
export const selectNotificationOpen = (state: { notificationState?: NotificationState }) =>
  state.notificationState?.isOpen ?? false;
