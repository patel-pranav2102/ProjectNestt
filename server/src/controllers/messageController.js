import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import Workspace from '../models/Workspace.js';
import FileModel from '../models/File.js';
import { uploadBuffer } from '../services/cloudinary.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

// 1. SEND MESSAGE (REST Endpoint - handles text + attachments)
export const sendMessage = async (req, res, next) => {
  try {
    const { channelId, receiverId, content, forwardedFrom, parentId } = req.body;

    if (!content && !req.file) {
      throw new BadRequestError('Message must contain text content or an attachment.');
    }

    let attachments = [];
    if (req.file) {
      // Upload attachment to Cloudinary using file buffer
      const uploadResult = await uploadBuffer(req.file.buffer, 'projectnest/attachments');
      
      // Determine file type category
      let fileType = 'document';
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        fileType = 'video';
      }

      attachments.push({
        url: uploadResult.url,
        fileType,
        name: req.file.originalname,
      });
    }

    const message = new Message({
      channelId: channelId || null,
      receiverId: receiverId || null,
      senderId: req.user.id,
      content: content || '',
      attachments,
      parentId: parentId || null,
      forwardedFrom: forwardedFrom || null,
      readBy: [req.user.id],
    });

    await message.save();

    // Auto-register file in standalone collection if channelId exists
    if (req.file && channelId) {
      try {
        const channel = await Channel.findById(channelId);
        if (channel) {
          const fileRecord = new FileModel({
            workspaceId: channel.workspaceId,
            projectId: channel.projectId || null,
            uploadedBy: req.user.id,
            name: req.file.originalname,
            url: attachments[0].url,
            fileType: attachments[0].fileType,
            size: req.file.size || 0,
          });
          await fileRecord.save();
        }
      } catch (err) {
        console.error('Failed to auto-register file metadata:', err.message);
      }
    }

    if (parentId) {
      await Message.findByIdAndUpdate(parentId, { $push: { replies: message._id } });
    }

    // Populate sender details before responding
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email avatarUrl status')
      .populate('receiverId', 'name email avatarUrl status')
      .populate({
        path: 'parentId',
        populate: { path: 'senderId', select: 'name email avatarUrl status' }
      });

    // Broadcast the attachment message via Socket.io
    const io = req.app.get('io');
    if (io) {
      if (channelId) {
        io.to(`channel:${channelId}`).emit('messageReceived', populatedMessage);
      } else if (receiverId) {
        io.to(`user:${receiverId}`).to(`user:${req.user.id}`).emit('messageReceived', populatedMessage);
      }
    }

    res.status(201).json({
      status: 'success',
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET CHANNEL MESSAGES (PAGINATED & SEARCHABLE)
export const getChannelMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new NotFoundError('Channel not found.');
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(channel.workspaceId);
    const isMember = workspace?.members?.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You are not authorized to view this workspace.');
    }

    // Verify private channel access
    if (channel.isPrivate && !channel.members.some(m => m.toString() === req.user.id)) {
      throw new ForbiddenError('You do not have access to this private channel.');
    }

    const query = { channelId };
    if (search && search.trim() !== '') {
      query.content = { $regex: search, $options: 'i' };
    }

    const totalCount = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('senderId', 'name email avatarUrl status')
      .populate('forwardedFrom', 'name email')
      .populate({
        path: 'parentId',
        populate: { path: 'senderId', select: 'name email avatarUrl status' }
      });

    res.status(200).json({
      status: 'success',
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET DIRECT MESSAGES (DMs - PAGINATED & SEARCHABLE)
export const getDMMessages = async (req, res, next) => {
  try {
    const { receiverId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;

    const query = {
      $or: [
        { senderId: req.user.id, receiverId },
        { senderId: receiverId, receiverId: req.user.id }
      ]
    };

    if (search && search.trim() !== '') {
      query.content = { $regex: search, $options: 'i' };
    }

    const totalCount = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('senderId', 'name email avatarUrl status')
      .populate('receiverId', 'name email avatarUrl status')
      .populate('forwardedFrom', 'name email')
      .populate({
        path: 'parentId',
        populate: { path: 'senderId', select: 'name email avatarUrl status' }
      });

    res.status(200).json({
      status: 'success',
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// 4. EDIT MESSAGE (REST)
export const editMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      throw new BadRequestError('Message content is required.');
    }

    const message = await Message.findById(id);
    if (!message) {
      throw new NotFoundError('Message not found.');
    }

    if (message.senderId.toString() !== req.user.id) {
      throw new ForbiddenError('You can only edit your own messages.');
    }

    message.content = content;
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name email avatarUrl status')
      .populate('receiverId', 'name email avatarUrl status')
      .populate({
        path: 'parentId',
        populate: { path: 'senderId', select: 'name email avatarUrl status' }
      });

    res.status(200).json({
      status: 'success',
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 5. DELETE MESSAGE (REST)
export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      throw new NotFoundError('Message not found.');
    }

    // A user can delete their own message. Or a workspace owner/admin can delete any message.
    let hasDeleteRights = message.senderId.toString() === req.user.id;

    if (!hasDeleteRights && message.channelId) {
      const channel = await Channel.findById(message.channelId);
      if (channel) {
        const workspace = await Workspace.findById(channel.workspaceId);
        const isWsAdmin = workspace?.owner.toString() === req.user.id || 
          workspace?.members?.find(m => m.userId.toString() === req.user.id)?.role === 'Admin';
        
        hasDeleteRights = !!isWsAdmin;
      }
    }

    if (!hasDeleteRights) {
      throw new ForbiddenError('You do not have permission to delete this message.');
    }

    await Message.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      messageId: id,
      message: 'Message deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 6. TOGGLE PIN MESSAGE
export const togglePinMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      throw new NotFoundError('Message not found.');
    }

    // Toggle pin status
    message.isPinned = !message.isPinned;
    await message.save();

    res.status(200).json({
      status: 'success',
      isPinned: message.isPinned,
      message: `Message ${message.isPinned ? 'pinned' : 'unpinned'} successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// 7. MANAGE MESSAGE REACTION (ADD / REMOVE EMOJI)
export const toggleReaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      throw new BadRequestError('Emoji character is required.');
    }

    const message = await Message.findById(id);
    if (!message) {
      throw new NotFoundError('Message not found.');
    }

    // Check if user already reacted with this exact emoji
    const reactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === req.user.id && r.emoji === emoji
    );

    if (reactionIndex !== -1) {
      // Remove reaction if it already exists
      message.reactions.splice(reactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ userId: req.user.id, emoji });
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('reactions.userId', 'name avatarUrl');

    res.status(200).json({
      status: 'success',
      reactions: populated.reactions,
    });
  } catch (error) {
    next(error);
  }
};
