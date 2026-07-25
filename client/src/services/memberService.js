import API from './api.js';

export const updateMemberRole = async (workspaceId, userId, role) => {
  const response = await API.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
  return response.data;
};

export const removeMember = async (workspaceId, userId) => {
  const response = await API.delete(`/workspaces/${workspaceId}/members/${userId}`);
  return response.data;
};
