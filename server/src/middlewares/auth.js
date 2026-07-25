import jwt from 'jsonwebtoken';
import multer from 'multer';
import { UnauthorizedError, ForbiddenError, BadRequestError } from '../utils/errors.js';

// JWT authentication protector middleware
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check Authorization header for Bearer token
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('Please log in to access this resource.'));
    }

    // Verify Access Token
    const secret = process.env.JWT_SECRET || 'dev_access_secret_123456789_placeholder';
    const decoded = jwt.verify(token, secret);

    // Attach decoded user credentials to request
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Your access token has expired. Please refresh.'));
    }
    next(new UnauthorizedError('Invalid authorization token.'));
  }
};

// Role authorization guard middleware
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }
    next();
  };
};

// Multer memory-storage configuration for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow only standard image formats
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only image file uploads are supported.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

// Middleware for a single image upload (binds field name "avatar")
export const uploadSingle = (req, res, next) => {
  const uploadAction = upload.single('avatar');
  
  uploadAction(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new BadRequestError('File exceeds 5MB size limit.'));
        }
        return next(new BadRequestError(err.message));
      }
      return next(err);
    }
    next();
  });
};
