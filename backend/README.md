# Veda AI Backend

A Node.js and TypeScript backend API for managing assignments with MongoDB storage.

## Features

- ✅ Create assignments with file uploads (Images & PDFs)
- ✅ Retrieve all assignments
- ✅ Get specific assignment by ID
- ✅ Update assignment details
- ✅ Delete assignments
- ✅ File validation (20MB limit)
- ✅ Input validation using express-validator
- ✅ TypeScript support for type safety

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # MongoDB connection
│   ├── models/
│   │   └── Assignment.ts        # Assignment schema
│   ├── controllers/
│   │   └── assignmentController.ts  # Business logic
│   ├── routes/
│   │   └── assignments.ts       # API routes
│   ├── middleware/
│   │   └── multer.ts            # File upload middleware
│   └── index.ts                 # Server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Getting Started

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your MongoDB URI:
```env
MONGO_URI=mongodb://localhost:27017/veda-ai
PORT=5000
NODE_ENV=development
```

### Running the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

## API Endpoints

### 1. Create Assignment
**POST** `/api/assignments/create`

Creates a new assignment with optional file upload.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  ```json
  {
    "assignmentName": "Physics Assignment 1",
    "dueDate": "2024-03-25",
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
    "additionalInfo": "Submit before 5 PM",
    "file": <binary file>
  }
  ```

**Response:**
```json
{
  "success": true,
  "message": "Assignment created successfully",
  "data": {
    "_id": "65fb1234567890abc",
    "assignmentName": "Physics Assignment 1",
    "fileName": "question-paper.pdf",
    "fileUrl": "/uploads/question-paper-1234567890.pdf",
    "dueDate": "2024-03-25",
    "questions": [...],
    "additionalInfo": "Submit before 5 PM",
    "createdAt": "2024-03-18T10:30:00Z",
    "updatedAt": "2024-03-18T10:30:00Z"
  }
}
```

### 2. Get All Assignments
**GET** `/api/assignments/all`

Retrieves all assignments sorted by creation date (newest first).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65fb1234567890abc",
      "assignmentName": "Physics Assignment 1",
      ...
    }
  ]
}
```

### 3. Get Assignment by ID
**GET** `/api/assignments/:id`

Retrieves a specific assignment by its ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65fb1234567890abc",
    "assignmentName": "Physics Assignment 1",
    ...
  }
}
```

### 4. Update Assignment
**PUT** `/api/assignments/:id`

Updates assignment details.

**Request:**
```json
{
  "assignmentName": "Updated Name",
  "dueDate": "2024-03-26",
  "questions": [...],
  "additionalInfo": "Updated info"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Assignment updated successfully",
  "data": { ... }
}
```

### 5. Delete Assignment
**DELETE** `/api/assignments/:id`

Deletes an assignment by its ID.

**Response:**
```json
{
  "success": true,
  "message": "Assignment deleted successfully"
}
```

### 6. Health Check
**GET** `/health`

Server health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-03-18T10:30:00Z"
}
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/veda-ai

# Server Configuration
PORT=5000
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=20971520  # 20MB
UPLOAD_DIR=uploads
```

## MongoDB Setup

### Local MongoDB
If you don't have MongoDB installed, install it from [mongodb.com](https://www.mongodb.com/try/download/community)

### MongoDB Atlas (Cloud)
1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and get your connection string
3. Update `MONGO_URI` in `.env` with your connection string

## Validation Rules

### Assignment Creation
- **assignmentName:** Required, max 100 characters
- **dueDate:** Required, valid date string
- **questions:** Required, array with at least one question type
- **additionalInfo:** Optional, max 1000 characters
- **file:** Optional, supports JPG, PNG, GIF, WebP, PDF (max 20MB)

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Development

### Build TypeScript
```bash
npm run build
```

The compiled JavaScript will be in the `dist/` directory.

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Compile TypeScript
- `npm start` - Run production server
- `npm run lint` - Lint code (if eslint is configured)

## Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **multer** - File upload handling
- **express-validator** - Input validation
- **cors** - Cross-Origin Resource Sharing
- **dotenv** - Environment variables

## License

MIT
