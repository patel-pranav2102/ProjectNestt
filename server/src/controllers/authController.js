import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
import { uploadBuffer } from '../services/cloudinary.js';
import { generateAccessToken, generateRefreshToken } from '../utils/tokens.js';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError
} from '../utils/errors.js';

// 1. REGISTER
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists.');
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user
    const user = new User({
      name,
      email,
      passwordHash: password, // Pre-save hooks will encrypt it
      verificationToken,
      verificationTokenExpires,
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email during register:', emailError);
      // We don't fail registration if mail fails in dev, but log it
    }

    res.status(201).json({
      status: 'success',
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (error) {
    next(error);
  }
};

// 2. LOGIN
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user and explicitly request password hash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Block access if user has not verified email
    if (!user.isVerified) {
      throw new ForbiddenError('Please verify your email address before logging in.');
    }

    // Set online status
    user.status = 'online';
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set Refresh Token in secure httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: 'success',
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. LOGOUT
export const logout = async (req, res, next) => {
  try {
    // Set user status offline
    if (req.user) {
      await User.findByIdAndUpdate(req.user.id, { status: 'offline' });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// 4. REFRESH TOKEN
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token missing. Please log in again.');
    }

    // Verify Refresh Token
    const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_123456789_placeholder';
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token. Please log in again.');
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User session not found.');
    }

    // Sign new access token
    const accessToken = generateAccessToken(user);

    res.status(200).json({
      status: 'success',
      token: accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// 5. EMAIL VERIFICATION
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new BadRequestError('Verification token is invalid or has expired.');
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// 6. FORGOT PASSWORD
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('No account found with this email address.');
    }

    // Generate random recovery token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Send email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      throw new BadRequestError('Failed to send recovery email. Please try again.');
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset link has been sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

// 7. RESET PASSWORD
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new BadRequestError('Password reset token is invalid or has expired.');
    }

    // Update password (pre-save hook hashes it)
    user.passwordHash = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully! You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// 8. GET PROFILE
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    res.status(200).json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 9. UPDATE PROFILE
export const updateProfile = async (req, res, next) => {
  try {
    const { name, role } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (role) updates.role = role;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    res.status(200).json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 10. UPLOAD AVATAR
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('Please upload an avatar image.');
    }

    // Stream upload file buffer to Cloudinary
    const uploadResult = await uploadBuffer(req.file.buffer);

    // Save avatar URL to User
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatarUrl: uploadResult.url } },
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    res.status(200).json({
      status: 'success',
      avatarUrl: user.avatarUrl,
      message: 'Avatar uploaded successfully.',
    });
  } catch (error) {
    next(error);
  }
};
