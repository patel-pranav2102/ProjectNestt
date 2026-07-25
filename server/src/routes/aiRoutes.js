import express from 'express';
import { 
  generateChatResponse, 
  suggestCodeCompletion, 
  getHistory, 
  getHistoryDetails, 
  deleteHistory 
} from '../controllers/aiController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/chat', generateChatResponse);
router.post('/complete', suggestCodeCompletion);
router.get('/history', getHistory);
router.get('/history/:id', getHistoryDetails);
router.delete('/history/:id', deleteHistory);

export default router;
