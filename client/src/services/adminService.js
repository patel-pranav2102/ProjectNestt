import API from './api.js';

export const fetchSystemUsers = async () => {
  const response = await API.get('/admin/users');
  return response.data;
};

export const createSystemUser = async (userData) => {
  const response = await API.post('/admin/users', userData);
  return response.data;
};

export const updateSystemUser = async (id, userData) => {
  const response = await API.put(`/admin/users/${id}`, userData);
  return response.data;
};

export const deleteSystemUser = async (id) => {
  const response = await API.delete(`/admin/users/${id}`);
  return response.data;
};
