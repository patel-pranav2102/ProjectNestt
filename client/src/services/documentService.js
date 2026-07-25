import API from './api.js';

export const createNewDocument = async (documentData) => {
  const response = await API.post('/documents', documentData);
  return response.data;
};

export const fetchProjectDocuments = async (projectId) => {
  const response = await API.get(`/documents/project/${projectId}`);
  return response.data;
};

export const fetchDocumentDetails = async (id) => {
  const response = await API.get(`/documents/${id}`);
  return response.data;
};

export const saveNewVersionSnapshot = async (id, content) => {
  const response = await API.post(`/documents/${id}/version`, { content });
  return response.data;
};

export const restoreVersionSnapshot = async (id, versionId) => {
  const response = await API.post(`/documents/${id}/restore`, { versionId });
  return response.data;
};

export const deleteDocumentDetails = async (id) => {
  const response = await API.delete(`/documents/${id}`);
  return response.data;
};

export const updateDocumentDetails = async (id, documentData) => {
  const response = await API.put(`/documents/${id}`, documentData);
  return response.data;
};
