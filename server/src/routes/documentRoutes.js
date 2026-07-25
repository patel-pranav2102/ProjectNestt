import express from 'express';
import { 
  createDocument, 
  getProjectDocuments, 
  getDocumentDetails, 
  saveVersion, 
  restoreVersion, 
  deleteDocument,
  updateDocument
} from '../controllers/documentController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createDocument);
router.get('/project/:projectId', getProjectDocuments);
router.get('/:id', getDocumentDetails);
router.put('/:id', updateDocument);
router.post('/:id/version', saveVersion);
router.post('/:id/restore', restoreVersion);
router.delete('/:id', deleteDocument);

export default router;
