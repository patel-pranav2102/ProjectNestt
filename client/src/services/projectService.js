import API from './api.js';

export const createNewProject = async (projectData) => {
  const response = await API.post('/projects', projectData);
  return response.data;
};

export const fetchProjectsInWorkspace = async (workspaceId) => {
  const response = await API.get(`/projects/workspace/${workspaceId}`);
  return response.data;
};

export const fetchProjectDetails = async (id) => {
  const response = await API.get(`/projects/${id}`);
  return response.data;
};

export const updateProjectDetails = async (id, projectData) => {
  const response = await API.put(`/projects/${id}`, projectData);
  return response.data;
};

export const archiveProjectStatus = async (id, archiveData) => {
  const response = await API.post(`/projects/${id}/archive`, archiveData);
  return response.data;
};

export const deleteProjectDetails = async (id) => {
  const response = await API.delete(`/projects/${id}`);
  return response.data;
};

export const addMemberToProject = async (id, { userId, role }) => {
  const response = await API.post(`/projects/${id}/members`, { userId, role });
  return response.data;
};

export const removeMemberFromProject = async (id, userId) => {
  const response = await API.delete(`/projects/${id}/members/${userId}`);
  return response.data;
};
