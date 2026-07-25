import API from './api.js';

export const fetchNotifications = async (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  const response = await API.get(`/notifications${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await API.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await API.patch('/notifications/read-all');
  return response.data;
};

export const deleteNotificationById = async (id) => {
  const response = await API.delete(`/notifications/${id}`);
  return response.data;
};
