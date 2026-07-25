import API from './api.js';

export const fetchWorkspaceActivities = async (workspaceId) => {
  const response = await API.get(`/workspaces/${workspaceId}/activities`);
  return response.data;
};
