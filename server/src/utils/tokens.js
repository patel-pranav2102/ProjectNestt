import jwt from 'jsonwebtoken';

// Generate short-lived Access Token
export const generateAccessToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev_access_secret_123456789_placeholder';
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    }, 
    secret, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate long-lived Refresh Token
export const generateRefreshToken = (user) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_123456789_placeholder';
  return jwt.sign(
    { id: user._id }, 
    secret, 
    { expiresIn: '7d' }
  );
};
