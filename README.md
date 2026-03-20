# Veda AI - Assignment Management System

A full-stack web application for creating, managing, and generating exam questions for assignments. Built with Next.js, Express.js, MongoDB, and AI-powered question generation using Google Gemini API.

## Features

### Assignment Management
- Create assignments with descriptions and file uploads
- Upload support for PDFs and images (20MB limit)
- View all assignments in a responsive grid layout
- Update assignment details
- Delete assignments with confirmation
- Assign due dates and track submission status

### AI-Powered Question Generation
- Generate exam questions automatically using Google Gemini API
- Support for multiple question types (MCQ, Short-answer, Long-answer, Numerical, Descriptive)
- Extract text from PDFs and images using OCR
- Asynchronous processing with Bull job queue
- Status tracking for question generation jobs
- Customizable question counts and marking schemes

### File Management
- Secure file storage on AWS S3
- Automatic PDF generation from assignment data
- Image processing and optimization using Sharp
- File preview and download capabilities

### User Interface
- Modern, responsive design with Tailwind CSS
- Dark mode support
- Toast notifications with Sonner
- Smooth animations and transitions
- Mobile-friendly interface

## Tech Stack

### Frontend
- Next.js 15 - React framework with SSR
- React 19 - UI library
- TypeScript - Type safety
- Tailwind CSS - Utility-first styling
- Lucide React - Icon library
- html2pdf.js - PDF export
- Sonner - Toast notifications

### Backend
- Node.js - Runtime
- Express.js - Web framework
- TypeScript - Type safety
- MongoDB - NoSQL database
- Mongoose - ODM for MongoDB
- Bull - Job queue
- Redis - Message broker & caching
- Google Generative AI - AI question generation
- AWS S3 - Cloud file storage
- pdf-parse - PDF text extraction
- Sharp - Image processing
- PDFKit - PDF generation

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or cloud)
- Redis (for queue management)
- Google Gemini API Key (free tier available at https://aistudio.google.com/apikey)
- AWS Account (for S3 bucket)

Optional:
- Docker - For running MongoDB and Redis in containers

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd untitled\ folder

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Setup Environment Variables

Frontend (.env.local) - Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Backend (.env) - Create a `.env` file in the `backend/` directory:
```env
# Database
MONGO_URI=mongodb://localhost:27017/veda-ai
PORT=5000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=20971520  # 20MB in bytes
```

### 3. Start Services

Start MongoDB & Redis using Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
docker run -d -p 6379:6379 --name redis redis:latest
```

Or using Homebrew (macOS):
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

brew install redis
brew services start redis
```

Start Backend API Server:
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

Start Question Generation Worker:
```bash
cd backend
npm run worker
```

Start Frontend Development Server:
```bash
npm run dev
# Frontend runs on http://localhost:3000
```

Or run everything concurrently:
```bash
# Backend (from backend directory)
npm run dev:all

# Frontend (from root directory)
npm run dev
```

## Project Structure

```
.
├── app/                          # Next.js frontend
│   ├── api/                      # API client services
│   │   └── assignmentService.ts
│   ├── components/               # React components
│   │   ├── AssignmentsList.tsx
│   │   ├── AssignmentViewer.tsx
│   │   ├── CreateAssignment.tsx
│   │   ├── QuestionsViewer.tsx
│   │   ├── AssignmentPreview.tsx
│   │   └── NotificationDropdown.tsx
│   ├── context/                  # React context
│   │   └── NotificationContext.tsx
│   ├── hooks/                    # Custom React hooks
│   │   └── useNotifications.ts
│   ├── utils/                    # Utility functions
│   │   └── pdfGenerator.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   ├── providers.tsx             # App providers
│   └── globals.css               # Global styles
│
├── backend/                      # Express.js backend
│   ├── src/
│   │   ├── config/               # Configuration files
│   │   │   ├── database.ts       # MongoDB connection
│   │   │   ├── s3.ts             # AWS S3 setup
│   │   │   └── customS3Storage.ts
│   │   ├── models/               # Mongoose schemas
│   │   │   └── Assignment.ts
│   │   ├── controllers/          # Business logic
│   │   │   └── assignmentController.ts
│   │   ├── services/             # Service layer
│   │   │   ├── fileProcessingService.ts
│   │   │   ├── geminiService.ts
│   │   │   ├── pdfGeneratorService.ts
│   │   │   └── s3PdfGeneratorService.ts
│   │   ├── routes/               # API routes
│   │   │   └── assignments.ts
│   │   ├── middleware/           # Express middleware
│   │   │   └── multer.ts
│   │   ├── queue/                # Bull queue setup
│   │   │   └── questionGenerationQueue.ts
│   │   ├── jobs/                 # Job processors
│   │   │   └── questionGenerationJob.ts
│   │   ├── workers/              # Worker processes
│   │   │   └── questionGenerationWorker.ts
│   │   ├── types/                # TypeScript definitions
│   │   │   └── pdf-parse.d.ts
│   │   └── index.ts              # Server entry point
│   ├── uploads/                  # Temporary upload directory
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── public/                       # Static assets
│   └── logo.avif
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

## API Endpoints

### Assignments

Create Assignment:
```
POST /api/assignments/create
Content-Type: multipart/form-data

Body:
{
  "assignmentName": "Physics Assignment 1",
  "dueDate": "2024-03-25",
  "description": "Chapter 5-7: Motion and Forces",
  "questions": [
    {
      "type": "Multiple Choice Questions",
      "count": 4,
      "marks": 1
    },
    {
      "type": "Short Questions",
      "count": 3,
      "marks": 2
    }
  ],
  "file": <binary>
}
```

Get All Assignments:
```
GET /api/assignments
Response: Array of assignment objects
```

Get Assignment by ID:
```
GET /api/assignments/:id
Response: Single assignment object with questions
```

Update Assignment:
```
PUT /api/assignments/:id
Content-Type: application/json

Body:
{
  "assignmentName": "Updated Name",
  "dueDate": "2024-03-30",
  "description": "Updated description"
}
```

Delete Assignment:
```
DELETE /api/assignments/:id
Response: { success: true, message: "Assignment deleted" }
```

## Configuration

### AWS S3 Setup

1. Create an AWS S3 bucket
2. Generate AWS Access Key and Secret Key from IAM
3. Add credentials to `.env`:
```env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

### Google Gemini API Setup

1. Visit https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Create a new API key
4. Add to `.env`:
```env
GEMINI_API_KEY=your-api-key
```

### Redis Setup

For macOS:
```bash
brew install redis
brew services start redis

# Verify Redis is running
redis-cli ping
```

For Linux:
```bash
sudo apt-get install redis-server
redis-server

# Or as a service
sudo systemctl start redis-server
```

## Question Generation Workflow

1. User uploads file via the UI
2. API receives request and queues a job in Redis
3. API responds immediately (non-blocking)
4. Worker process extracts text from PDF/image
5. Gemini API generates questions based on content
6. Results stored in MongoDB
7. Toast notification displayed to user via Sonner
8. User views generated questions in the UI

## Development

### Running Tests
```bash
# Frontend
npm run test

# Backend
cd backend
npm run test
```

### Building for Production

Frontend:
```bash
npm run build
npm start
```

Backend:
```bash
cd backend
npm run build
npm run start:all
```

### Code Quality

```bash
# Lint frontend code
npm run lint

# Lint backend code
cd backend
npm run lint
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MONGO_URI in .env
- Verify network connectivity

### Redis Connection Issues
- Ensure Redis is running
- Check REDIS_HOST and REDIS_PORT in .env
- Reset Redis if needed: redis-cli FLUSHALL

### Question Generation Not Working
- Verify GEMINI_API_KEY is set and valid
- Check worker process is running
- View worker logs for errors
- Ensure Redis is running

### File Upload Issues
- Check MAX_FILE_SIZE in .env (default: 20MB)
- Verify AWS S3 credentials and bucket permissions
- Check file upload includes Content-Type: multipart/form-data

## Environment Checklist

- [ ] Node.js installed (v16+)
- [ ] MongoDB running
- [ ] Redis running
- [ ] Google Gemini API key obtained
- [ ] AWS S3 bucket created
- [ ] AWS credentials configured
- [ ] All .env files created and filled
- [ ] Dependencies installed

# Made By Abhishek Karad