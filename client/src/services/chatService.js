import API from './api.js';

// --- Channels REST Endpoints ---
export const createNewChannel = async (channelData) => {
  const response = await API.post('/channels', channelData);
  return response.data;
};

export const fetchWorkspaceChannels = async (workspaceId) => {
  const response = await API.get(`/channels/workspace/${workspaceId}`);
  return response.data;
};

export const fetchChannelDetails = async (id) => {
  const response = await API.get(`/channels/${id}`);
  return response.data;
};

export const deleteChannelDetails = async (id) => {
  const response = await API.delete(`/channels/${id}`);
  return response.data;
};

// --- Messages REST Endpoints ---
export const fetchChannelMessages = async (channelId, search = '') => {
  const response = await API.get(`/messages/channel/${channelId}`, {
    params: { search }
  });
  return response.data;
};

export const fetchDMMessages = async (receiverId, search = '') => {
  const response = await API.get(`/messages/dm/${receiverId}`, {
    params: { search }
  });
  return response.data;
};

// Uses multipart/form-data for file attachments
export const postNewMessage = async (formData) => {
  const response = await API.post('/messages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const editMessageContent = async (id, content) => {
  const response = await API.put(`/messages/${id}`, { content });
  return response.data;
};

export const deleteMessageById = async (id) => {
  const response = await API.delete(`/messages/${id}`);
  return response.data;
};

export const togglePinStatus = async (id) => {
  const response = await API.post(`/messages/${id}/pin`);
  return response.data;
};

export const toggleReactionStatus = async (id, emoji) => {
  const response = await API.post(`/messages/${id}/react`, { emoji });
  return response.data;
};
