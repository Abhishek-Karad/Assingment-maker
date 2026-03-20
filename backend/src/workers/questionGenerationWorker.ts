import dotenv from 'dotenv';
import path from 'path';
import Bull from 'bull';
import connectDB from '../config/database';
import { getQuestionQueue } from '../queue/questionGenerationQueue';
import { processQuestionGenerationJob } from '../jobs/questionGenerationJob';

dotenv.config();

interface QuestionGenerationJobData {
  assignmentId: string;
  topic: string;
  subject?: string;
  questionCount: number;
  marks?: number[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  filePath?: string;
  additionalContext?: string;
}

/**
 * Initialize the worker process
 */
const initializeWorker = async (): Promise<void> => {
  console.log('🔄 Starting Question Generation Worker...');
  
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get the queue
    const queue = getQuestionQueue();
    console.log('✅ Connected to Bull Queue');

    // Process jobs
    queue.process(
      5, // Number of concurrent jobs
      async (job: Bull.Job<QuestionGenerationJobData>) => {
        try {
          console.log(`\n📋 Processing Job #${job.id}`);
          console.log('Data:', job.data);

          const result = await processQuestionGenerationJob(job.data);
          
          console.log(`✅ Job #${job.id} completed successfully`);
          return result;
        } catch (error) {
          console.error(`❌ Job #${job.id} failed:`, error);
          throw error;
        }
      }
    );

    console.log('✅ Worker is ready to process jobs\n');
    console.log('Waiting for jobs...\n');

  } catch (error) {
    console.error('❌ Failed to initialize worker:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const setupGracefulShutdown = (): void => {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    try {
      const queue = getQuestionQueue();
      await queue.close();
      console.log('✅ Queue closed');
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Main function
 */
const main = async (): Promise<void> => {
  setupGracefulShutdown();
  await initializeWorker();
};

// Start the worker
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
