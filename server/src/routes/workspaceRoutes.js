import express from 'express';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceDetails,
  updateWorkspace,
  joinWorkspace,
  leaveWorkspace,
  regenerateInviteCode,
  deleteWorkspace,
  getWorkspaceStats,
  searchWorkspace,
  updateMemberRole,
  removeMember,
  getWorkspaceCalendar,
  getWorkspaceAnalytics,
  getWorkspaceActivities
} from '../controllers/workspaceController.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import { isWorkspaceMember, isWorkspaceAdmin } from '../middlewares/workspaceAuth.js';

const router = express.Router();

// Apply auth protector to all workspace routes
router.use(protect);

router.post('/', restrictTo('Admin', 'Team Lead'), createWorkspace);
router.get('/', getMyWorkspaces);
router.post('/join', joinWorkspace);

router.get('/:id', isWorkspaceMember, getWorkspaceDetails);
router.get('/:id/stats', isWorkspaceMember, getWorkspaceStats);
router.get('/:id/search', isWorkspaceMember, searchWorkspace);
router.get('/:id/calendar', isWorkspaceMember, getWorkspaceCalendar);
router.get('/:id/analytics', isWorkspaceMember, getWorkspaceAnalytics);
router.get('/:id/activities', isWorkspaceMember, getWorkspaceActivities);
router.put('/:id', isWorkspaceMember, isWorkspaceAdmin, updateWorkspace);
router.delete('/:id', isWorkspaceMember, isWorkspaceAdmin, deleteWorkspace);
router.post('/:id/invite', isWorkspaceMember, isWorkspaceAdmin, regenerateInviteCode);
router.post('/:id/leave', isWorkspaceMember, leaveWorkspace);
router.patch('/:id/members/:userId/role', isWorkspaceMember, isWorkspaceAdmin, updateMemberRole);
router.delete('/:id/members/:userId', isWorkspaceMember, isWorkspaceAdmin, removeMember);

export default router;
