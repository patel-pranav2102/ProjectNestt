import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  conversations: [],
  activeConversation: null,
  selectedModel: 'Gemini Pro v2',
  loading: false,
  error: null,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    setSelectedModel: (state, action) => {
      state.selectedModel = action.payload;
    },
    addConversationMessage: (state, action) => {
      if (state.activeConversation) {
        state.activeConversation.messages.push(action.payload);
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearAiStore: (state) => {
      state.conversations = [];
      state.activeConversation = null;
      state.selectedModel = 'Gemini Pro v2';
      state.loading = false;
      state.error = null;
    }
  },
});

export const {
  setConversations,
  setActiveConversation,
  setSelectedModel,
  addConversationMessage,
  setLoading,
  setError,
  clearAiStore
} = aiSlice.actions;

export default aiSlice.reducer;
export const selectAiConversations = (state) => state.ai.conversations;
export const selectActiveAiConversation = (state) => state.ai.activeConversation;
export const selectSelectedModel = (state) => state.ai.selectedModel;
export const selectAiLoading = (state) => state.ai.loading;
export const selectAiError = (state) => state.ai.error;
