import express from 'express';
import { 
  createChannel, 
  getWorkspaceChannels, 
  getChannelDetails, 
  addChannelMember, 
  removeChannelMember, 
  deleteChannel 
} from '../controllers/channelController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createChannel);
router.get('/workspace/:workspaceId', getWorkspaceChannels);
router.get('/:id', getChannelDetails);
router.post('/:id/members', addChannelMember);
router.delete('/:id/members/:userId', removeChannelMember);
router.delete('/:id', deleteChannel);

export default router;
