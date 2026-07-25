import express from 'express';
import { 
  createDrawing, 
  getProjectDrawings, 
  getDrawingDetails, 
  updateDrawing, 
  deleteDrawing 
} from '../controllers/drawingController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createDrawing);
router.get('/project/:projectId', getProjectDrawings);
router.get('/:id', getDrawingDetails);
router.put('/:id', updateDrawing);
router.delete('/:id', deleteDrawing);

export default router;
