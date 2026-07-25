import express from 'express';
import {
  getWorkspaceFiles,
  registerFile,
} from '../controllers/fileController.js';
import { protect } from '../middlewares/auth.js';
import { isWorkspaceMember } from '../middlewares/workspaceAuth.js';

const router = express.Router();

router.use(protect);

router.post('/', registerFile);
router.get('/workspace/:id', isWorkspaceMember, getWorkspaceFiles);

export default router;
