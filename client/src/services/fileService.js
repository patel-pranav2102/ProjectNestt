import API from './api.js';

export const fetchWorkspaceFiles = async (workspaceId) => {
  const response = await API.get(`/files/workspace/${workspaceId}`);
  return response.data;
};

export const registerFileMetadata = async (fileData) => {
  const response = await API.post('/files', fileData);
  return response.data;
};
