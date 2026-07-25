import API from './api.js';

export const fetchWorkspaceCalendar = async (workspaceId, year, month) => {
  const response = await API.get(`/workspaces/${workspaceId}/calendar`, {
    params: { year, month },
  });
  return response.data;
};
