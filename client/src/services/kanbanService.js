import API from './api.js';

// --- Board Endpoints ---
export const createNewBoard = async (boardData) => {
  const response = await API.post('/boards', boardData);
  return response.data;
};

export const fetchProjectBoards = async (projectId) => {
  const response = await API.get(`/boards/project/${projectId}`);
  return response.data;
};

export const fetchBoardDetails = async (id) => {
  const response = await API.get(`/boards/${id}`);
  return response.data;
};

export const updateBoardDetails = async (id, boardData) => {
  const response = await API.put(`/boards/${id}`, boardData);
  return response.data;
};

export const deleteBoardDetails = async (id) => {
  const response = await API.delete(`/boards/${id}`);
  return response.data;
};

// --- Card Endpoints ---
export const createNewCard = async (cardData) => {
  const response = await API.post('/cards', cardData);
  return response.data;
};

export const fetchCardDetails = async (id) => {
  const response = await API.get(`/cards/${id}`);
  return response.data;
};

export const updateCardDetails = async (id, cardData) => {
  const response = await API.put(`/cards/${id}`, cardData);
  return response.data;
};

export const moveCardPosition = async (id, { targetColumn, targetPosition }) => {
  const response = await API.patch(`/cards/${id}/move`, { targetColumn, targetPosition });
  return response.data;
};

export const toggleCardAssignee = async (id, userId) => {
  const response = await API.post(`/cards/${id}/assign`, { userId });
  return response.data;
};

export const postCardComment = async (id, text) => {
  const response = await API.post(`/cards/${id}/comments`, { text });
  return response.data;
};

export const removeCardComment = async (id, commentId) => {
  const response = await API.delete(`/cards/${id}/comments/${commentId}`);
  return response.data;
};

export const deleteCardDetails = async (id) => {
  const response = await API.delete(`/cards/${id}`);
  return response.data;
};
