import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import workspaceReducer from './workspaceSlice.js';
import teamReducer from './teamSlice.js';
import projectReducer from './projectSlice.js';
import chatReducer from './chatSlice.js';
import kanbanReducer from './kanbanSlice.js';
import documentReducer from './documentSlice.js';
import whiteboardReducer from './whiteboardSlice.js';
import aiReducer from './aiSlice.js';
import notificationReducer from './notificationSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    team: teamReducer,
    project: projectReducer,
    chat: chatReducer,
    kanban: kanbanReducer,
    document: documentReducer,
    whiteboard: whiteboardReducer,
    ai: aiReducer,
    notification: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable check for non-serializable data if needed (e.g. Socket objects)
    }),
});

export default store;
