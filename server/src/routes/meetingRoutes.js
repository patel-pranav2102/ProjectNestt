import express from 'express';
import {
  scheduleMeeting,
  getWorkspaceMeetings,
  deleteMeeting,
} from '../controllers/meetingController.js';
import { protect } from '../middlewares/auth.js';
import { isWorkspaceMember, isWorkspaceAdmin } from '../middlewares/workspaceAuth.js';

const router = express.Router();

router.use(protect);

router.post('/', isWorkspaceMember, isWorkspaceAdmin, scheduleMeeting);
router.get('/workspace/:id', isWorkspaceMember, getWorkspaceMeetings);
router.delete('/:id', deleteMeeting);

export default router;
