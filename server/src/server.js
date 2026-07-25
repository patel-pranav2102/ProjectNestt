import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import socketAuth from './sockets/socketAuth.js';
import { registerChatSocket } from './sockets/chatSocket.js';
import { registerDocumentSocket } from './sockets/documentSocket.js';
import { registerWhiteboardSocket } from './sockets/whiteboardSocket.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Handle server error events (e.g. port already in use)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Clean shutdown of resources...`);
    process.exit(1);
  } else {
    console.error('Server error encountered:', error);
  }
});

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Bind socket instance to express app to support REST event dispatches
app.set('io', io);

// Register Handshake Token Authentication
io.use(socketAuth);

// Basic Socket connection handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.user.id})`);
  registerChatSocket(io, socket);
  registerDocumentSocket(io, socket);
  registerWhiteboardSocket(io, socket);
});

// Database Connection and Server Startup
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start listening
    server.listen(PORT, () => {
      console.log(`ProjectNest backend is listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    console.error('Server startup failed. Exiting...', error);
    process.exit(1);
  }
};

// Handle process termination cleanly
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  if (io) {
    try {
      io.close();
      console.log('Socket.io server closed.');
    } catch (err) {
      console.error('Error closing Socket.io:', err.message);
    }
  }

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }

  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
    } catch (err) {
      console.error('Error closing MongoDB connection:', err.message);
    }
    console.log('Graceful shutdown completed.');
    process.exit(0);
  });

  // Safe timeout to force exit if shutdown hangs
  setTimeout(() => {
    console.log('Forcing exit after timeout...');
    process.exit(0);
  }, 1000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Nodemon restarts handle (SIGUSR2)
process.once('SIGUSR2', () => {
  console.log('Nodemon restart signal received (SIGUSR2). Freeing resources...');
  
  if (io) {
    try {
      io.close();
    } catch (err) {
      // ignore
    }
  }

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }

  server.close(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      console.error('Error during shutdown:', err.message);
    }
    process.kill(process.pid, 'SIGUSR2');
  });

  // Safe timeout to force restart if close hangs
  setTimeout(() => {
    process.kill(process.pid, 'SIGUSR2');
  }, 1000);
});

startServer();
