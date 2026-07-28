import API from './api.js';

export const fetchWorkspaceFiles = async (workspaceId) => {
  const response = await API.get(`/files/workspace/${workspaceId}`);
  return response.data;
};

export const registerFileMetadata = async (fileData) => {
  const response = await API.post('/files', fileData);
  return response.data;
};

// Upload an actual file (binary) to the server which stores it in Cloudinary
export const uploadFileToWorkspace = async (file, workspaceId, projectId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspaceId', workspaceId);
  if (projectId) formData.append('projectId', projectId);

  const response = await API.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
