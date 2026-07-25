import API from './api.js';

export const askCopilotChat = async ({ conversationId, projectId, messages, selectedModel }) => {
  const response = await API.post('/ai/chat', { conversationId, projectId, messages, selectedModel });
  return response.data;
};

export const fetchInlineCompletions = async (codeData) => {
  const response = await API.post('/ai/complete', codeData);
  return response.data;
};

export const fetchAiHistoryList = async () => {
  const response = await API.get('/ai/history');
  return response.data;
};

export const fetchAiHistoryDetails = async (id) => {
  const response = await API.get(`/ai/history/${id}`);
  return response.data;
};

export const deleteAiHistoryLog = async (id) => {
  const response = await API.delete(`/ai/history/${id}`);
  return response.data;
};
