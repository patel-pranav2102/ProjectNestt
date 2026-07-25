import express from 'express';
import { 
  register, 
  login, 
  logout, 
  refresh, 
  verifyEmail, 
  forgotPassword, 
  resetPassword, 
  getProfile, 
  updateProfile, 
  uploadAvatar 
} from '../controllers/authController.js';
import { protect, uploadSingle } from '../middlewares/auth.js';
import { 
  validateRegister, 
  validateLogin, 
  validateForgotPassword, 
  validateResetPassword, 
  validateUpdateProfile 
} from '../validation/authValidation.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refresh);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, resetPassword);

// Protected routes (require valid JWT)
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validateUpdateProfile, updateProfile);
router.post('/profile/avatar', protect, uploadSingle, uploadAvatar);

export default router;
