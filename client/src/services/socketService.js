import { io } from 'socket.io-client';
import { 
  addMessage, 
  updateMessage, 
  setUserTyping, 
  removeUserTyping 
} from '../features/chatSlice.js';
import { addNotification } from '../features/notificationSlice.js';

export let socket = null;

export const initSocket = (token, dispatch) => {
  if (socket) return socket;

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'https://projectnestt.onrender.com';
  
  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Connected to ProjectNest socket server:', socket.id);
  });

  // Real-Time Event Subscriptions
  socket.on('messageReceived', (message) => {
    dispatch(addMessage(message));
  });

  socket.on('notification:new', (notif) => {
    dispatch(addNotification(notif));
  });

  socket.on('messageSeenUpdated', ({ messageId, readBy }) => {
    // We update message locally
    dispatch(updateMessage({ _id: messageId, readBy }));
  });

  socket.on('typing', ({ userId, userName }) => {
    dispatch(setUserTyping({ userId, userName }));
  });

  socket.on('stopTyping', ({ userId }) => {
    dispatch(removeUserTyping(userId));
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from ProjectNest socket server');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
