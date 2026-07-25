import express from 'express';
import { 
  createCard, 
  getCardDetails, 
  updateCard, 
  moveCard, 
  assignMember, 
  addComment, 
  deleteComment,
  deleteCard 
} from '../controllers/cardController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createCard);
router.get('/:id', getCardDetails);
router.put('/:id', updateCard);
router.patch('/:id/move', moveCard);
router.post('/:id/assign', assignMember);
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', deleteComment);
router.delete('/:id', deleteCard);

export default router;
