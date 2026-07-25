import API from './api.js';

export const createNewDrawing = async (drawingData) => {
  const response = await API.post('/drawings', drawingData);
  return response.data;
};

export const fetchProjectDrawings = async (projectId) => {
  const response = await API.get(`/drawings/project/${projectId}`);
  return response.data;
};

export const fetchDrawingDetails = async (id) => {
  const response = await API.get(`/drawings/${id}`);
  return response.data;
};

export const updateDrawingDetails = async (id, { elements, appState }) => {
  const response = await API.put(`/drawings/${id}`, { elements, appState });
  return response.data;
};

export const deleteDrawingDetails = async (id) => {
  const response = await API.delete(`/drawings/${id}`);
  return response.data;
};
