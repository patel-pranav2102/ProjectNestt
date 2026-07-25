import express from 'express';
import { 
  createBoard, 
  getProjectBoards, 
  getBoardDetails, 
  updateBoard, 
  deleteBoard 
} from '../controllers/boardController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createBoard);
router.get('/project/:projectId', getProjectBoards);
router.get('/:id', getBoardDetails);
router.put('/:id', updateBoard);
router.delete('/:id', deleteBoard);

export default router;
