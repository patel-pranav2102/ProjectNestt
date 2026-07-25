import Channel from '../models/Channel.js';
import Workspace from '../models/Workspace.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

// 1. CREATE CHANNEL
export const createChannel = async (req, res, next) => {
  try {
    const { workspaceId, projectId, name, description, isPrivate, members } = req.body;

    if (!workspaceId) {
      throw new BadRequestError('Workspace ID is required.');
    }
    if (!name || name.trim() === '') {
      throw new BadRequestError('Channel name is required.');
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    const isMember = workspace.members.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You are not authorized to create channels in this workspace.');
    }

    // Initialize members array for private channels
    let channelMembers = [];
    if (isPrivate) {
      // Creator is always a member of private channel
      channelMembers = [req.user.id];
      if (members && Array.isArray(members)) {
        // Filter out duplicate or non-workspace members
        members.forEach(userId => {
          if (workspace.members.some(m => m.userId.toString() === userId) && userId !== req.user.id) {
            channelMembers.push(userId);
          }
        });
      }
    }

    const channel = new Channel({
      workspaceId,
      projectId: projectId || null,
      name,
      description,
      isPrivate: !!isPrivate,
      members: isPrivate ? channelMembers : [],
    });

    await channel.save();

    res.status(201).json({
      status: 'success',
      channel,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET WORKSPACE CHANNELS
export const getWorkspaceChannels = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // Verify workspace membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    const isMember = workspace.members.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You must be a workspace member to view channels.');
    }

    // Find public channels OR private channels where the user is a member
    const channels = await Channel.find({
      workspaceId,
      $or: [
        { isPrivate: false },
        { isPrivate: true, members: req.user.id }
      ]
    }).sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      channels,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET CHANNEL DETAILS
export const getChannelDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const channel = await Channel.findById(id)
      .populate('members', 'name email avatarUrl status');

    if (!channel) {
      throw new NotFoundError('Channel not found.');
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(channel.workspaceId);
    const isMember = workspace?.members?.some(m => m.userId.toString() === req.user.id);
    if (!isMember) {
      throw new ForbiddenError('You are not authorized to access this workspace.');
    }

    // Verify private channel access
    if (channel.isPrivate && !channel.members.some(m => m._id.toString() === req.user.id)) {
      throw new ForbiddenError('You do not have access to this private channel.');
    }

    res.status(200).json({
      status: 'success',
      channel,
    });
  } catch (error) {
    next(error);
  }
};

// 4. ADD CHANNEL MEMBER (Private Channels)
export const addChannelMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const channel = await Channel.findById(id);
    if (!channel) {
      throw new NotFoundError('Channel not found.');
    }
    if (!channel.isPrivate) {
      throw new BadRequestError('Cannot add members to public channels.');
    }

    // Verify current user is a private channel member (or workspace owner/admin)
    const workspace = await Workspace.findById(channel.workspaceId);
    const isWsAdmin = workspace?.owner.toString() === req.user.id || 
      workspace?.members?.find(m => m.userId.toString() === req.user.id)?.role === 'Admin';
    const isChanMember = channel.members.some(m => m.toString() === req.user.id);

    if (!isWsAdmin && !isChanMember) {
      throw new ForbiddenError('Only private channel members or workspace administrators can invite users.');
    }

    // Verify target user is in parent workspace
    const isTargetWsMember = workspace.members.some(m => m.userId.toString() === userId);
    if (!isTargetWsMember) {
      throw new BadRequestError('User must belong to parent workspace first.');
    }

    // Check duplicate
    if (channel.members.some(m => m.toString() === userId)) {
      throw new BadRequestError('User is already in this channel.');
    }

    channel.members.push(userId);
    await channel.save();

    res.status(200).json({
      status: 'success',
      message: 'User added to private channel successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 5. REMOVE CHANNEL MEMBER
export const removeChannelMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const channel = await Channel.findById(id);
    if (!channel) {
      throw new NotFoundError('Channel not found.');
    }
    if (!channel.isPrivate) {
      throw new BadRequestError('Cannot remove members from public channels.');
    }

    // Verify permissions: Admin, or user leaving themselves
    const workspace = await Workspace.findById(channel.workspaceId);
    const isWsAdmin = workspace?.owner.toString() === req.user.id || 
      workspace?.members?.find(m => m.userId.toString() === req.user.id)?.role === 'Admin';
    const isSelf = req.user.id === userId;

    if (!isWsAdmin && !isSelf) {
      throw new ForbiddenError('You do not have permission to remove this user.');
    }

    channel.members = channel.members.filter(m => m.toString() !== userId);
    await channel.save();

    res.status(200).json({
      status: 'success',
      message: 'User removed from private channel successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 6. DELETE CHANNEL
export const deleteChannel = async (req, res, next) => {
  try {
    const { id } = req.params;

    const channel = await Channel.findById(id);
    if (!channel) {
      throw new NotFoundError('Channel not found.');
    }

    if (channel.name === 'general') {
      throw new BadRequestError('The general channel cannot be deleted.');
    }

    // Verify workspace Admin/Owner rights
    const workspace = await Workspace.findById(channel.workspaceId);
    const isOwner = workspace?.owner.toString() === req.user.id;
    const wsMember = workspace?.members?.find(m => m.userId.toString() === req.user.id);
    const isWsAdmin = wsMember && wsMember.role === 'Admin';

    if (!isOwner && !isWsAdmin) {
      throw new ForbiddenError('Only workspace administrators can delete channels.');
    }

    await Channel.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Channel deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
