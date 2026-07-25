export const registerDocumentSocket = (io, socket) => {
  const userId = socket.user.id;
  const userName = socket.user.name;

  // 1. Join Collaborative Document Editing Room
  socket.on('joinDocument', ({ documentId }) => {
    const room = `document:${documentId}`;
    socket.join(room);
    console.log(`User ${userName} joined document room: ${documentId}`);

    // Notify other editors in room
    socket.to(room).emit('documentCollaboratorJoined', { userId, userName });
  });

  // 2. Leave Document Room
  socket.on('leaveDocument', ({ documentId }) => {
    const room = `document:${documentId}`;
    socket.leave(room);
    console.log(`User ${userName} left document room: ${documentId}`);
    
    socket.to(room).emit('documentCollaboratorLeft', { userId, userName });
  });

  // 3. Broadcast live edits (title, content) to other editors in the room
  socket.on('documentEdit', ({ documentId, title, content }) => {
    const room = `document:${documentId}`;
    socket.to(room).emit('documentUpdate', { title, content, editorId: userId });
  });
};
