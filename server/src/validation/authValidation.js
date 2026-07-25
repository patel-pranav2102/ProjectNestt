import { BadRequestError } from '../utils/errors.js';

// Helper to validate email formats
const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Validation middleware for registration
export const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || name.trim() === '') {
    return next(new BadRequestError('Name is required.'));
  }
  if (name.length > 50) {
    return next(new BadRequestError('Name cannot exceed 50 characters.'));
  }

  if (!email || email.trim() === '') {
    return next(new BadRequestError('Email is required.'));
  }
  if (!isValidEmail(email)) {
    return next(new BadRequestError('Please provide a valid email address.'));
  }

  if (!password || password.length < 8) {
    return next(new BadRequestError('Password must be at least 8 characters long.'));
  }

  next();
};

// Validation middleware for login
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || email.trim() === '') {
    return next(new BadRequestError('Email is required.'));
  }
  if (!isValidEmail(email)) {
    return next(new BadRequestError('Please provide a valid email address.'));
  }

  if (!password) {
    return next(new BadRequestError('Password is required.'));
  }

  next();
};

// Validation middleware for forgot password requests
export const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email || email.trim() === '') {
    return next(new BadRequestError('Email is required.'));
  }
  if (!isValidEmail(email)) {
    return next(new BadRequestError('Please provide a valid email address.'));
  }

  next();
};

// Validation middleware for password resets
export const validateResetPassword = (req, res, next) => {
  const { password } = req.body;

  if (!password || password.length < 8) {
    return next(new BadRequestError('Password must be at least 8 characters long.'));
  }

  next();
};

// Validation middleware for profile updates
export const validateUpdateProfile = (req, res, next) => {
  const { name, role } = req.body;

  if (name !== undefined && name.trim() === '') {
    return next(new BadRequestError('Name cannot be empty.'));
  }
  if (name && name.length > 50) {
    return next(new BadRequestError('Name cannot exceed 50 characters.'));
  }

  if (role && !['Admin', 'Team Lead', 'Developer'].includes(role)) {
    return next(new BadRequestError('Invalid role specified.'));
  }

  next();
};
