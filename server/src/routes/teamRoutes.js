import express from 'express';
import { 
  createTeam, 
  getWorkspaceTeams, 
  getTeamDetails, 
  updateTeam, 
  deleteTeam, 
  addTeamMember, 
  removeTeamMember 
} from '../controllers/teamController.js';
import { protect } from '../middlewares/auth.js';
import { isTeamLeadOrWorkspaceAdmin } from '../middlewares/teamAuth.js';

const router = express.Router();

// Apply auth protector to all team routes
router.use(protect);

router.post('/', createTeam);
router.get('/workspace/:workspaceId', getWorkspaceTeams);
router.get('/:id', getTeamDetails);

router.put('/:id', isTeamLeadOrWorkspaceAdmin, updateTeam);
router.delete('/:id', isTeamLeadOrWorkspaceAdmin, deleteTeam);
router.post('/:id/members', isTeamLeadOrWorkspaceAdmin, addTeamMember);
router.delete('/:id/members/:userId', isTeamLeadOrWorkspaceAdmin, removeTeamMember);

export default router;
