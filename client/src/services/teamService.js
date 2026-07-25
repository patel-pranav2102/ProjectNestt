import API from './api.js';

export const createNewTeam = async (teamData) => {
  const response = await API.post('/teams', teamData);
  return response.data;
};

export const fetchTeamsInWorkspace = async (workspaceId) => {
  const response = await API.get(`/teams/workspace/${workspaceId}`);
  return response.data;
};

export const fetchTeamDetails = async (id) => {
  const response = await API.get(`/teams/${id}`);
  return response.data;
};

export const updateTeam = async (id, teamData) => {
  const response = await API.put(`/teams/${id}`, teamData);
  return response.data;
};

export const deleteTeam = async (id) => {
  const response = await API.delete(`/teams/${id}`);
  return response.data;
};

export const addMemberToTeam = async (id, { userId, role }) => {
  const response = await API.post(`/teams/${id}/members`, { userId, role });
  return response.data;
};

export const removeMemberFromTeam = async (id, userId) => {
  const response = await API.delete(`/teams/${id}/members/${userId}`);
  return response.data;
};
