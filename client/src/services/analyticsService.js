import API from './api.js';

export const fetchWorkspaceAnalytics = async (workspaceId) => {
  const response = await API.get(`/workspaces/${workspaceId}/analytics`);
  return response.data;
};
