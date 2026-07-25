import express from 'express';
import multer from 'multer';
import { 
  sendMessage, 
  getChannelMessages, 
  getDMMessages, 
  editMessage, 
  deleteMessage, 
  togglePinMessage, 
  toggleReaction 
} from '../controllers/messageController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Limit files to 10MB
});

router.use(protect);

router.post('/', upload.single('file'), sendMessage);
router.get('/channel/:channelId', getChannelMessages);
router.get('/dm/:receiverId', getDMMessages);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/pin', togglePinMessage);
router.post('/:id/react', toggleReaction);

export default router;
