import express from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// All notification routes require auth
router.use(protect);

router.get('/',                   getMyNotifications);
router.patch('/read-all',         markAllAsRead);
router.patch('/:id/read',         markAsRead);
router.delete('/:id',             deleteNotification);

export default router;
