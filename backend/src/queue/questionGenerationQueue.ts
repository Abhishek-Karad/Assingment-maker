import Bull from 'bull';

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

const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`Invalid ${key} value "${value}". Using fallback ${fallback}.`);
    return fallback;
  }

  return parsed;
};

/**
 * Get Redis connection URL
 */
const getRedisUrl = (): string => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  return `redis://${host}:${port}`;
};

/**
 * Initialize or get question generation queue
 */
let questionGenerationQueue: Bull.Queue<QuestionGenerationJobData> | null = null;

export const initializeQuestionQueue = (): Bull.Queue<QuestionGenerationJobData> => {
  if (questionGenerationQueue) {
    return questionGenerationQueue;
  }

  const redisUrl = getRedisUrl();
  
  questionGenerationQueue = new Bull<QuestionGenerationJobData>(
    'question-generation',
    redisUrl
  );

  // Event listeners
  questionGenerationQueue.on('completed', (job: Bull.Job<QuestionGenerationJobData>) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  questionGenerationQueue.on('failed', (job: Bull.Job<QuestionGenerationJobData>, err: Error) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
  });

  questionGenerationQueue.on('error', (error: Error) => {
    console.error('Queue error:', error);
  });

  console.log('Question generation queue initialized');
  
  return questionGenerationQueue;
};

/**
 * Get the question generation queue
 */
export const getQuestionQueue = (): Bull.Queue<QuestionGenerationJobData> => {
  if (!questionGenerationQueue) {
    return initializeQuestionQueue();
  }
  return questionGenerationQueue;
};

/**
 * Add a question generation job to the queue
 */
export const queueQuestionGeneration = async (
  data: QuestionGenerationJobData,
  options?: Bull.JobOptions
): Promise<Bull.Job<QuestionGenerationJobData>> => {
  const queue = getQuestionQueue();
  const timeoutMs = getEnvNumber('QUESTION_JOB_TIMEOUT_MS', 5 * 60 * 1000);
  const backoffDelayMs = getEnvNumber('QUESTION_JOB_BACKOFF_DELAY_MS', 60 * 1000);
  
  const defaultOptions: Bull.JobOptions = {
    attempts: 5, // Increased from 3 to handle rate limits better
    backoff: {
      type: 'exponential',
      delay: backoffDelayMs
    },
    removeOnComplete: false,
    removeOnFail: false,
    timeout: timeoutMs,
    ...options
  };

  return queue.add(data, defaultOptions);
};

/**
 * Get job by ID
 */
export const getJobById = async (
  jobId: string
): Promise<Bull.Job<QuestionGenerationJobData> | null> => {
  const queue = getQuestionQueue();
  return queue.getJob(jobId);
};

/**
 * Get job status
 */
export const getJobStatus = async (
  jobId: string
): Promise<{
  status: string;
  progress: number;
  data?: any;
  result?: any;
  error?: string;
} | null> => {
  const job = await getJobById(jobId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress() || 0;
  
  return {
    status: state,
    progress: typeof progress === 'number' ? progress : 0,
    data: job.data,
    result: job.returnvalue,
    error: job.failedReason
  };
};

/**
 * Pause the queue
 */
export const pauseQueue = async (): Promise<void> => {
  const queue = getQuestionQueue();
  await queue.pause();
  console.log('Question generation queue paused');
};

/**
 * Resume the queue
 */
export const resumeQueue = async (): Promise<void> => {
  const queue = getQuestionQueue();
  await queue.resume();
  console.log('Question generation queue resumed');
};

/**
 * Clear the queue
 */
export const clearQueue = async (): Promise<void> => {
  const queue = getQuestionQueue();
  await queue.clean(0, 'completed');
  await queue.clean(0, 'failed');
  console.log('Question generation queue cleared');
};

/**
 * Get queue stats
 */
export const getQueueStats = async (): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> => {
  const queue = getQuestionQueue();
  
  const counts = await queue.getJobCounts();
  
  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0
  };
};

/**
 * Close the queue connection
 */
export const closeQueue = async (): Promise<void> => {
  if (questionGenerationQueue) {
    await questionGenerationQueue.close();
    questionGenerationQueue = null;
    console.log('Question generation queue closed');
  }
};
