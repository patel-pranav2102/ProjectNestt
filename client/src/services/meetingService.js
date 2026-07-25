import API from './api.js';

export const fetchWorkspaceMeetings = async (workspaceId, year, month) => {
  const response = await API.get(`/meetings/workspace/${workspaceId}`, {
    params: { year, month },
  });
  return response.data;
};

export const createMeeting = async (meetingData) => {
  const response = await API.post('/meetings', meetingData);
  return response.data;
};

export const deleteMeetingById = async (id) => {
  const response = await API.delete(`/meetings/${id}`);
  return response.data;
};
