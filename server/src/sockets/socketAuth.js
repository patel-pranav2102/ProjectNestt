import jwt from 'jsonwebtoken';

/**
 * Socket.io Handshake authentication middleware.
 * Verifies JWT token supplied during connection setup.
 */
export const socketAuth = (socket, next) => {
  try {
    // Read token from handshake auth payload or query parameters
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const secret = process.env.JWT_SECRET || 'dev_access_secret_123456789_placeholder';
    const decoded = jwt.verify(token, secret);

    // Store user data in socket session
    socket.user = decoded; // { id, email, role }
    
    next();
  } catch (error) {
    console.error('Socket authentication failed:', error.message);
    next(new Error('Authentication error: Invalid or expired token'));
  }
};
export default socketAuth;
