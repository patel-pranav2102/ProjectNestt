import API from './api.js';

export const registerUser = async (userData) => {
  const response = await API.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await API.post('/auth/login', credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await API.post('/auth/logout');
  return response.data;
};

export const verifyEmailToken = async (token) => {
  const response = await API.get(`/auth/verify-email/${token}`);
  return response.data;
};

export const forgotPasswordRequest = async (emailData) => {
  const response = await API.post('/auth/forgot-password', emailData);
  return response.data;
};

export const resetPasswordRequest = async (token, passwordData) => {
  const response = await API.post(`/auth/reset-password/${token}`, passwordData);
  return response.data;
};

export const fetchUserProfile = async () => {
  const response = await API.get('/auth/profile');
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await API.put('/auth/profile', profileData);
  return response.data;
};

export const uploadUserAvatar = async (formData) => {
  const response = await API.post('/auth/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
