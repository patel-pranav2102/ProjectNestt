import { createSlice, createSelector } from '@reduxjs/toolkit';

const initialState = {
  channels: [],
  contacts: [],
  activeConversation: null, // { id, type: 'channel' | 'dm', name, avatarUrl }
  messages: [],
  typingUsers: {}, // { [userId]: userName }
  unreadCounts: {}, // { [conversationId]: count }
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChannels: (state, action) => {
      state.channels = action.payload;
    },
    addChannel: (state, action) => {
      state.channels.push(action.payload);
    },
    removeChannel: (state, action) => {
      state.channels = state.channels.filter(c => c._id !== action.payload);
      if (state.activeConversation?.id === action.payload) {
        state.activeConversation = null;
        state.messages = [];
      }
    },
    setContacts: (state, action) => {
      state.contacts = action.payload;
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
      state.messages = [];
      state.typingUsers = {};
      if (action.payload) {
        state.unreadCounts[action.payload.id] = 0;
      }
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      const msg = action.payload;
      // Determine if message belongs to active conversation
      const isActive = state.activeConversation && (
        (state.activeConversation.type === 'channel' && msg.channelId === state.activeConversation.id) ||
        (state.activeConversation.type === 'dm' && !msg.channelId && (
          msg.senderId._id === state.activeConversation.id || msg.receiverId?._id === state.activeConversation.id
        ))
      );

      if (isActive) {
        // Prevent duplicate loads
        if (!state.messages.some(m => m._id === msg._id)) {
          state.messages.push(msg);
        }
      } else {
        // Increment unread count
        const key = msg.channelId || msg.senderId._id;
        state.unreadCounts[key] = (state.unreadCounts[key] || 0) + 1;
      }
    },
    updateMessage: (state, action) => {
      const updated = action.payload;
      state.messages = state.messages.map(m => {
        let msg = m._id === updated._id ? { ...m, ...updated } : m;
        if (msg.parentId && typeof msg.parentId === 'object' && msg.parentId._id === updated._id) {
          msg = {
            ...msg,
            parentId: {
              ...msg.parentId,
              ...updated
            }
          };
        }
        return msg;
      });
    },
    removeMessage: (state, action) => {
      state.messages = state.messages.filter(m => m._id !== action.payload);
    },
    setUserTyping: (state, action) => {
      const { userId, userName } = action.payload;
      state.typingUsers[userId] = userName;
    },
    removeUserTyping: (state, action) => {
      delete state.typingUsers[action.payload];
    },
    setUnreadCounts: (state, action) => {
      state.unreadCounts = action.payload;
    },
    clearChatStore: (state) => {
      state.channels = [];
      state.contacts = [];
      state.activeConversation = null;
      state.messages = [];
      state.typingUsers = {};
      state.unreadCounts = {};
    }
  },
});

export const {
  setChannels,
  addChannel,
  removeChannel,
  setContacts,
  setActiveConversation,
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  setUserTyping,
  removeUserTyping,
  setUnreadCounts,
  clearChatStore
} = chatSlice.actions;

export default chatSlice.reducer;
export const selectChannels = (state) => state.chat.channels;
export const selectContacts = (state) => state.chat.contacts;
export const selectActiveConversation = (state) => state.chat.activeConversation;
export const selectChatMessages = (state) => state.chat.messages;
export const selectTypingUsers = createSelector(
  [(state) => state.chat.typingUsers],
  (typingUsers) => Object.values(typingUsers)
);
export const selectUnreadCounts = (state) => state.chat.unreadCounts;
