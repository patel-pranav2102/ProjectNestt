import express from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/adminController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// Apply auth protector and system admin privilege check globally to all admin routes
router.use(protect, restrictTo('Admin'));

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
