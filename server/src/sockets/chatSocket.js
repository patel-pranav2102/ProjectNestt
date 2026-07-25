import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

/**
 * Create a Notification document and push it in real-time to the
 * recipient's private socket room (`user:<recipientId>`).
 *
 * @param {import('socket.io').Server} io
 * @param {object} payload  - { recipient, type, message, link, workspaceId, triggeredBy }
 */
export const emitNotification = async (io, payload) => {
  try {
    const notif = await Notification.create(payload);
    const populated = await notif.populate('triggeredBy', 'name email avatarUrl');
    io.to(`user:${payload.recipient.toString()}`).emit('notification:new', populated);
  } catch (err) {
    console.error('[emitNotification] failed:', err.message);
  }
};



export const registerChatSocket = (io, socket) => {
  const userId = socket.user.id;

  // 1. Join user personal notification room on connect
  socket.join(`user:${userId}`);
  
  // Set user online status in database on connection
  User.findByIdAndUpdate(userId, { status: 'online' }).exec();
  io.emit('statusChanged', { userId, status: 'online' });

  // 2. Join specific conversation (channel or DM)
  socket.on('joinConversation', ({ conversationId, type }) => {
    const room = type === 'channel' ? `channel:${conversationId}` : `dm:${conversationId}`;
    socket.join(room);
  });

  // 3. Leave specific conversation
  socket.on('leaveConversation', ({ conversationId, type }) => {
    const room = type === 'channel' ? `channel:${conversationId}` : `dm:${conversationId}`;
    socket.leave(room);
  });

  // 4. Typing Indicator triggers
  socket.on('typing', ({ conversationId, type, userName }) => {
    const room = type === 'channel' ? `channel:${conversationId}` : `dm:${conversationId}`;
    socket.to(room).emit('typing', { conversationId, type, userId, userName });
  });

  socket.on('stopTyping', ({ conversationId, type }) => {
    const room = type === 'channel' ? `channel:${conversationId}` : `dm:${conversationId}`;
    socket.to(room).emit('stopTyping', { conversationId, type, userId });
  });

  // 5. Send Real-Time Text Messages
  socket.on('sendMessage', async ({ channelId, receiverId, content, parentId }) => {
    try {
      if (!content || content.trim() === '') return;

      const message = new Message({
        channelId: channelId || null,
        receiverId: receiverId || null,
        senderId: userId,
        content,
        parentId: parentId || null,
        readBy: [userId],
      });

      await message.save();

      if (parentId) {
        await Message.findByIdAndUpdate(parentId, { $push: { replies: message._id } });
      }

      const populated = await Message.findById(message._id)
        .populate('senderId', 'name email avatarUrl status')
        .populate('receiverId', 'name email avatarUrl status')
        .populate({
          path: 'parentId',
          populate: { path: 'senderId', select: 'name email avatarUrl status' }
        });

      if (channelId) {
        // Broadcast to channel room
        io.to(`channel:${channelId}`).emit('messageReceived', populated);
      } else if (receiverId) {
        // Send to sender and receiver user rooms
        io.to(`user:${receiverId}`).to(`user:${userId}`).emit('messageReceived', populated);
      }
    } catch (error) {
      console.error('Socket sendMessage error:', error);
    }
  });

  // 6. Read Receipts updates
  socket.on('messageSeen', async ({ messageId, conversationId, type }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.readBy.includes(userId)) {
        message.readBy.push(userId);
        await message.save();

        const room = type === 'channel' ? `channel:${conversationId}` : `dm:${conversationId}`;
        io.to(room).emit('messageSeenUpdated', { messageId, readBy: message.readBy });
      }
    } catch (error) {
      console.error('Socket messageSeen error:', error);
    }
  });

  // 7. Handle Disconnect and set status away or offline
  socket.on('disconnect', () => {
    // We update User status to offline
    User.findByIdAndUpdate(userId, { status: 'offline' }).exec();
    io.emit('statusChanged', { userId, status: 'offline' });
    console.log(`Socket disconnected: ${socket.id}`);
  });
};
