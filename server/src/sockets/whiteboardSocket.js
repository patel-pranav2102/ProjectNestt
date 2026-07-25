export const registerWhiteboardSocket = (io, socket) => {
  const userId = socket.user.id;
  const userName = socket.user.name;

  // 1. Join Collaborative Whiteboard Room
  socket.on('joinWhiteboard', ({ drawingId }) => {
    const room = `whiteboard:${drawingId}`;
    socket.join(room);
    console.log(`User ${userName} joined whiteboard: ${drawingId}`);
  });

  // 2. Leave Whiteboard Room
  socket.on('leaveWhiteboard', ({ drawingId }) => {
    const room = `whiteboard:${drawingId}`;
    socket.leave(room);
    console.log(`User ${userName} left whiteboard: ${drawingId}`);
  });

  // 3. Broadcast canvas edits (elements, appState) to other designers
  socket.on('whiteboardEdit', ({ drawingId, elements, appState }) => {
    const room = `whiteboard:${drawingId}`;
    socket.to(room).emit('whiteboardUpdate', { elements, appState, editorId: userId });
  });
};
