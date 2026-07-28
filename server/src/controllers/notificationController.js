import Notification from '../models/Notification.js';
import Workspace from '../models/Workspace.js';
import Team from '../models/Team.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

// 1. GET MY NOTIFICATIONS (paginated, newest first)
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('triggeredBy', 'name email avatarUrl'),
      Notification.countDocuments({ recipient: userId }),
    ]);

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.status(200).json({
      status: 'success',
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. MARK SINGLE NOTIFICATION AS READ
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) throw new NotFoundError('Notification not found.');
    if (notification.recipient.toString() !== req.user.id) {
      throw new ForbiddenError('Not authorised.');
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ status: 'success', notification });
  } catch (error) {
    next(error);
  }
};

// 3. MARK ALL NOTIFICATIONS AS READ
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ status: 'success', message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

// 4. DELETE SINGLE NOTIFICATION
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) throw new NotFoundError('Notification not found.');
    if (notification.recipient.toString() !== req.user.id) {
      throw new ForbiddenError('Not authorised.');
    }

    await notification.deleteOne();

    res.status(200).json({ status: 'success', message: 'Notification deleted.' });
  } catch (error) {
    next(error);
  }
};

// 5. ACCEPT WORKSPACE OR TEAM INVITATION
export const acceptInvite = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      throw new NotFoundError('Notification not found.');
    }
    if (notification.recipient.toString() !== req.user.id) {
      throw new ForbiddenError('Not authorised to accept this invitation.');
    }

    if (notification.type === 'workspace_invite') {
      const workspace = await Workspace.findById(notification.workspaceId);
      if (!workspace) {
        throw new NotFoundError('Workspace not found.');
      }

      // Check if already a member
      const isMember = workspace.members.some(m => m.userId.toString() === req.user.id);
      if (!isMember) {
        workspace.members.push({ userId: req.user.id, role: 'Member' });
        await workspace.save();
      }
    } else if (notification.type === 'team_invite') {
      const team = await Team.findById(notification.teamId);
      if (!team) {
        throw new NotFoundError('Team not found.');
      }

      // Check if already in team
      const isMember = team.members.some(m => m.userId.toString() === req.user.id);
      if (!isMember) {
        team.members.push({ userId: req.user.id, role: 'Member' });
        await team.save();
      }
    } else {
      throw new BadRequestError('This notification is not an invitation.');
    }

    // Delete invitation notification upon acceptance
    await notification.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Invitation accepted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 6. DECLINE WORKSPACE OR TEAM INVITATION
export const declineInvite = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      throw new NotFoundError('Notification not found.');
    }
    if (notification.recipient.toString() !== req.user.id) {
      throw new ForbiddenError('Not authorised to decline this invitation.');
    }

    if (notification.type !== 'workspace_invite' && notification.type !== 'team_invite') {
      throw new BadRequestError('This notification is not an invitation.');
    }

    // Delete the notification on decline
    await notification.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Invitation declined successfully.',
    });
  } catch (error) {
    next(error);
  }
};
