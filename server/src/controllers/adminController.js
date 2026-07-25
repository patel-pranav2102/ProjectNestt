import User from '../models/User.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

// 1. GET ALL USERS
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      users
    });
  } catch (error) {
    next(error);
  }
};

// 2. CREATE USER
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, status } = req.body;

    if (!name || !email || !password || !role) {
      throw new BadRequestError('Name, email, password, and role are required.');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError('A user with this email already exists.');
    }

    const user = new User({
      name,
      email,
      passwordHash: password, // will be hashed by pre-save hooks
      role, // 'Admin', 'Team Lead', 'Developer'
      status: status || 'offline',
      isVerified: true
    });

    await user.save();

    res.status(201).json({
      status: 'success',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. UPDATE USER
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        throw new BadRequestError('Email address is already in use.');
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password && password.trim() !== '') {
      user.passwordHash = password; // pre-save hook will hash it
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. DELETE USER
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent system admins from deleting their active logged-in account
    if (id === req.user.id) {
      throw new BadRequestError('You cannot delete your own admin account.');
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    res.status(200).json({
      status: 'success',
      message: 'User account deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
