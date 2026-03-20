# Question Generation System - Setup & Usage Guide

## Overview

This system uses **Bull MQ** (job queue) + **Redis** (message broker) + **Google Gemini API** to asynchronously generate exam questions from uploaded files or provided descriptions.

### Features
✅ **Non-blocking**: API responds immediately while Gemini generates questions  
✅ **File Support**: PDF, Images (with OCR), and Text files  
✅ **Rich Question Types**: MCQ, Short-answer, Long-answer, Numerical, Descriptive  
✅ **Scalable**: Queue handles multiple concurrent jobs  
✅ **Persistent**: Redis stores job state; failures auto-retry  
✅ **Status Tracking**: Check generation progress via API  

---

## Architecture

```
Frontend Upload
    ↓
Backend API (Express) → Save to MongoDB & Queue Job
    ↓
Redis Queue (Bull MQ)
    ↓
Worker Process (Separate Node instance)
    ↓
File Processing (PDF/Image/Text extraction)
    ↓
Gemini API (Generate Questions)
    ↓
Store in MongoDB
    ↓
Frontend Retrieves via API
```

---

## Prerequisites

### 1. **Redis Server**
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
redis-server

# Using Docker
docker run -d -p 6379:6379 redis:latest
```

### 2. **Google Gemini API Key**
Get it from: https://aistudio.google.com/apikey

### 3. **MongoDB**
Ensure MongoDB is running (should already be set up for your project)

---

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `bull` - Job queue
- `redis` - Redis client
- `@google/generative-ai` - Gemini API
- `pdf-parse` - PDF text extraction
- `sharp` - Image processing

### Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# .env file
GEMINI_API_KEY=your-api-key-here
REDIS_HOST=localhost
REDIS_PORT=6379
MONGO_URI=mongodb://localhost:27017/veda-ai
PORT=5000
UPLOAD_DIR=uploads
```

### Step 3: Start the System

**Terminal 1 - API Server:**
```bash
npm run dev
```

**Terminal 2 - Worker Process:**
```bash
npm run worker
```

Or run both together:
```bash
npm run dev:all
```

### Step 4: Verify Setup

Check health:
```bash
curl http://localhost:5000/health
```

---

## API Endpoints

### 1. Create Assignment with Question Generation

```bash
POST /api/assignments/create
Content-Type: multipart/form-data

Body (form-data):
- assignmentName: "Chapter 5 - Algebra"
- dueDate: "2024-04-20"
- topic: "Quadratic Equations"           # Required for generation
- subject: "Mathematics"                 # Optional
- questionCount: 10                      # Required for generation
- difficulty: "mixed"                    # easy|medium|hard|mixed
- additionalInfo: "Focus on applications"
- file: <upload PDF/Image/Text file>     # Optional
- questions: [
    {"type": "mcq", "count": 5, "marks": 1},
    {"type": "short-answer", "count": 3, "marks": 2},
    {"type": "long-answer", "count": 2, "marks": 5}
  ]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "123abc",
    "assignmentName": "Chapter 5 - Algebra",
    "questionGenerationQueued": true,
    "questionGenerationStatus": "pending"
  }
}
```

### 2. Check Question Generation Status

```bash
GET /api/assignments/:id/question-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignmentId": "123abc",
    "status": "completed",           # pending|processing|completed|failed
    "error": null,
    "completedAt": "2024-03-18T10:30:00Z",
    "jobStatus": {
      "status": "completed",
      "progress": 100
    },
    "questionsCount": 10
  }
}
```

### 3. Get Generated Questions

```bash
GET /api/assignments/:id/questions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "q1",
        "text": "Solve x² + 2x - 15 = 0",
        "type": "short-answer",
        "marks": 2,
        "difficulty": "medium",
        "sampleAnswer": "x = 3 or x = -5 (using factorization method)",
        "topic": "Quadratic Equations"
      },
      {
        "id": "q2",
        "text": "Which of the following is a quadratic equation?",
        "type": "mcq",
        "marks": 1,
        "difficulty": "easy",
        "options": [
          "2x + 3 = 0",
          "x² + 2x + 1 = 0",
          "3x + 5y = 2",
          "x³ - 1 = 0"
        ],
        "sampleAnswer": "B: x² + 2x + 1 = 0"
      }
      // ... more questions
    ],
    "totalCount": 10,
    "status": "completed",
    "completedAt": "2024-03-18T10:30:00Z"
  }
}
```

### 4. Regenerate Questions

```bash
POST /api/assignments/:id/regenerate-questions

Body (JSON):
{
  "topic": "New Topic",
  "questionCount": 15,
  "difficulty": "hard",
  "additionalContext": "Focus on complex problems"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Question regeneration job queued",
  "data": {
    "jobId": "job123",
    "assignmentId": "123abc"
  }
}
```

---

## File Processing

### Supported Formats

| Type | Extensions | Processing Method |
|------|-----------|-------------------|
| **PDF** | `.pdf` | Text extraction using pdf-parse |
| **Images** | `.jpg`, `.png`, `.webp` | Base64 encoding → Gemini Vision API |
| **Text** | `.txt`, `.md` | Direct file read |

### File Size Limits
- Default: **50 MB**
- Configure in `.env`: `MAX_FILE_SIZE=52428800`

### Example: Upload and Generate

```bash
curl -X POST http://localhost:5000/api/assignments/create \
  -F "assignmentName=Physics Chapter 3" \
  -F "dueDate=2024-04-20" \
  -F "topic=Mechanics" \
  -F "subject=Physics" \
  -F "questionCount=8" \
  -F "difficulty=hard" \
  -F "file=@physics_chapter3.pdf" \
  -F "questions=[{\"type\":\"mcq\",\"count\":4,\"marks\":1},{\"type\":\"numerical\",\"count\":4,\"marks\":2}]"
```

---

## Question Generation Prompt Structure

The system builds an intelligent prompt like this:

```
You are an expert educational content creator. Generate exactly 10 questions based on the following requirements:

Topic: Quadratic Equations
Subject: Mathematics
Difficulty Level: mixed
Marks Distribution: Use these mark values: 1, 2, 5

---REFERENCE MATERIAL---
[Extracted content from PDF/Image/Text]
---END REFERENCE---

Create questions ONLY based on the provided reference material above.

Additional Instructions:
Focus on applications and real-world problem-solving.

Return the questions in the following JSON format:
[JSON schema with id, text, type, marks, difficulty, options, sampleAnswer, topic]
```

---

## Monitoring the Queue

### Check Queue Status

Create a utility endpoint if needed:

```typescript
import { getQueueStats } from './queue/questionGenerationQueue';

app.get('/api/queue/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Then check:
```bash
curl http://localhost:5000/api/queue/stats
```

Output:
```json
{
  "waiting": 2,
  "active": 1,
  "completed": 154,
  "failed": 1,
  "delayed": 0
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `GEMINI_API_KEY not set` | Missing env variable | Add to `.env` |
| `Redis connection refused` | Redis not running | `brew services start redis` |
| `File not found` | Invalid filePath | Check uploads folder |
| `Failed to extract PDF` | Corrupt PDF | Try a different PDF |
| `Job timeout` | Long processing | Increase timeout in queue config |

### Check Job Failures

```typescript
const queue = getQuestionQueue();
const failed = await queue.getFailed(0, 10);
console.log('Failed jobs:', failed);
```

---

## Database Schema

### Assignment Collection

```javascript
{
  _id: ObjectId,
  assignmentName: String,
  dueDate: String,
  fileName: String,              // Original uploaded file name
  filePath: String,              // Path to uploaded file
  fileUrl: String,               // URL to serve file from
  questions: [{                  // Initial requirements
    type: String,
    count: Number,
    marks: Number
  }],
  additionalInfo: String,
  
  // Generated Content
  generatedQuestions: [{         // AI-generated questions
    id: String,
    text: String,
    type: Enum['mcq', 'short-answer', ...],
    marks: Number,
    difficulty: Enum['easy', 'medium', 'hard'],
    options: [String],           // For MCQ
    sampleAnswer: String,
    topic: String
  }],
  
  // Status Tracking
  questionGenerationStatus: 'pending|processing|completed|failed',
  questionGenerationError: String,
  questionGenerationCompletedAt: Date,
  jobId: String,                 // Bull job ID
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## Troubleshooting

### Worker Process Won't Start

```bash
# Clear any stuck redis entries
redis-cli FLUSHDB

# Restart both processes
npm run worker  # Terminal 2
npm run dev    # Terminal 1
```

### Questions Not Generating

1. Check worker logs for errors
2. Verify GEMINI_API_KEY is valid
3. Check Redis connection: `redis-cli ping` → should return "PONG"
4. Check MongoDB connection string

### Slow Generation

- Reduce `questionCount` parameter
- Use `difficulty: "easy"` instead of "mixed"
- Check Gemini API rate limits (400 requests/minute free tier)

---

## Performance Tips

1. **Batch Processing**: Queue multiple jobs; worker processes them in parallel
2. **Caching**: Redis caches job results by default
3. **Timeouts**: Set appropriate timeouts for large documents
4. **File Size**: Keep PDFs under 20 MB for fastest processing
5. **Concurrency**: Adjust worker process count based on CPU

---

## Running in Production

### Environment Variables
```bash
NODE_ENV=production
GEMINI_API_KEY=your-secure-key
REDIS_URL=redis://production-redis-host:6379
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/veda-ai
PORT=5000
```

### Process Manager (PM2)

```bash
npm install -g pm2

# Start both processes
pm2 start "npm run dev" --name "api-server"
pm2 start "npm run worker" --name "question-worker"

# Monitor
pm2 monit
```

---

## Support

For issues or questions:
1. Check `.env` file has all required variables
2. Verify Redis is running: `redis-cli ping`
3. Check MongoDB connection
4. Review worker logs in Terminal 2
5. Test Gemini API key validity through Google's console

---

**Happy Question Generating! 🎓**
