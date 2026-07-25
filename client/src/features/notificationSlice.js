import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload.notifications;
      state.unreadCount   = action.payload.unreadCount ?? 0;
      state.loading = false;
      state.error   = null;
    },
    addNotification: (state, action) => {
      // Prepend the incoming real-time notification
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    markRead: (state, action) => {
      const notif = state.notifications.find(n => n._id === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead: (state) => {
      state.notifications.forEach(n => { n.isRead = true; });
      state.unreadCount = 0;
    },
    removeNotification: (state, action) => {
      const idx = state.notifications.findIndex(n => n._id === action.payload);
      if (idx !== -1) {
        if (!state.notifications[idx].isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(idx, 1);
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error   = action.payload;
      state.loading = false;
    },
    clearNotificationStore: (state) => {
      state.notifications = [];
      state.unreadCount   = 0;
      state.loading = false;
      state.error   = null;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markRead,
  markAllRead,
  removeNotification,
  setLoading,
  setError,
  clearNotificationStore,
} = notificationSlice.actions;

export default notificationSlice.reducer;

// Selectors
export const selectNotifications  = (state) => state.notification.notifications;
export const selectUnreadCount    = (state) => state.notification.unreadCount;
export const selectNotifLoading   = (state) => state.notification.loading;
