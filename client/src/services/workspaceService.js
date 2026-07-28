import API from './api.js';

export const createWorkspace = async (workspaceData) => {
  const response = await API.post('/workspaces', workspaceData);
  return response.data;
};

export const fetchMyWorkspaces = async () => {
  const response = await API.get('/workspaces');
  return response.data;
};

export const fetchWorkspaceDetails = async (id) => {
  const response = await API.get(`/workspaces/${id}`);
  return response.data;
};

export const updateWorkspace = async (id, workspaceData) => {
  const response = await API.put(`/workspaces/${id}`, workspaceData);
  return response.data;
};

export const joinWorkspace = async (inviteCode) => {
  const response = await API.post('/workspaces/join', { inviteCode });
  return response.data;
};

export const leaveWorkspace = async (id) => {
  const response = await API.post(`/workspaces/${id}/leave`);
  return response.data;
};

export const regenerateInvite = async (id) => {
  const response = await API.post(`/workspaces/${id}/invite`);
  return response.data;
};

export const deleteWorkspace = async (id) => {
  const response = await API.delete(`/workspaces/${id}`);
  return response.data;
};

export const fetchWorkspaceStats = async (id) => {
  const response = await API.get(`/workspaces/${id}/stats`);
  return response.data;
};

export const searchWorkspace = async (id, params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  const response = await API.get(`/workspaces/${id}/search${qs ? `?${qs}` : ''}`);
  return response.data;
};

export const inviteMemberToWorkspace = async (workspaceId, email) => {
  const response = await API.post(`/workspaces/${workspaceId}/invites`, { email });
  return response.data;
};

