import express from 'express';
import multer from 'multer';
import {
  getWorkspaceFiles,
  registerFile,
  uploadFile,
} from '../controllers/fileController.js';
import { protect } from '../middlewares/auth.js';
import { isWorkspaceMember } from '../middlewares/workspaceAuth.js';

const router = express.Router();

// Multer: accept any file type up to 25MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

router.use(protect);

router.post('/', registerFile);
router.post('/upload', upload.single('file'), uploadFile);
router.get('/workspace/:id', isWorkspaceMember, getWorkspaceFiles);

export default router;
