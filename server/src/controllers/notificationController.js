import Notification from '../models/Notification.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

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
