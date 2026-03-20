// MUST be first - before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import connectDB from './config/database';
import { verifyS3Connection } from './config/s3';
import assignmentRoutes from './routes/assignments';
import { initializeQuestionQueue, closeQueue } from './queue/questionGenerationQueue';

const app: Express = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// S3-ONLY: No local file serving
console.log('📦 Using AWS S3 for all file uploads and storage');

// Check S3 configuration
const useS3 = process.env.USE_S3 === 'true';

// Connect to MongoDB
connectDB();

// Initialize S3 (REQUIRED)
if (!useS3) {
  throw new Error(
    '❌ CRITICAL: S3 upload is required but USE_S3 is not enabled.\n' +
    'Please set USE_S3=true in your .env file.\n' +
    'For production, you MUST use AWS S3 for file uploads.'
  );
}

console.log('🚀 Initializing AWS S3...');
verifyS3Connection().catch(error => {
  console.error('⚠️ Warning: S3 connection failed:', error);
  process.exit(1); // Exit if S3 is not available
});

// Initialize Bull MQ Queue
initializeQuestionQueue();
console.log('✅ Question generation queue initialized');

// Routes
app.use('/api/assignments', assignmentRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    await closeQueue();
    console.log('✅ Queue closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/health`);
});

export default app;
