import express from 'express';
import { 
  createProject, 
  getWorkspaceProjects, 
  getProjectDetails, 
  updateProject, 
  archiveProject, 
  deleteProject, 
  addProjectMember, 
  removeProjectMember 
} from '../controllers/projectController.js';
import { protect } from '../middlewares/auth.js';
import { isProjectMember, isProjectAdmin } from '../middlewares/projectAuth.js';

const router = express.Router();

// Apply auth protector to all project routes
router.use(protect);

router.post('/', createProject);
router.get('/workspace/:workspaceId', getWorkspaceProjects);
router.get('/:id', isProjectMember, getProjectDetails);

router.put('/:id', isProjectMember, isProjectAdmin, updateProject);
router.post('/:id/archive', isProjectMember, isProjectAdmin, archiveProject);
router.delete('/:id', isProjectMember, isProjectAdmin, deleteProject);
router.post('/:id/members', isProjectMember, isProjectAdmin, addProjectMember);
router.delete('/:id/members/:userId', isProjectMember, isProjectAdmin, removeProjectMember);

export default router;
