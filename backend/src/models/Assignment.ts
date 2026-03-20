import mongoose, { Document, Schema } from 'mongoose';

interface Question {
  type: string;
  count: number;
  marks: number;
}

interface GeneratedQuestion {
  id: string;
  text: string;
  type: 'mcq' | 'short-answer' | 'long-answer' | 'numerical' | 'descriptive';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  sampleAnswer?: string;
  topic?: string;
}

interface IAssignment extends Document {
  assignmentName: string;
  fileName?: string;
  fileUrl?: string;
  filePath?: string;
  dueDate: string;
  questions: Question[];
  additionalInfo: string;
  generatedQuestions?: GeneratedQuestion[];
  questionGenerationStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  questionGenerationError?: string;
  questionGenerationCompletedAt?: Date;
  jobId?: string;
  pdfFilePath?: string;
  schoolName?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema({
  type: { type: String, required: true },
  count: { type: Number, required: true },
  marks: { type: Number, required: true }
});

const generatedQuestionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  type: {
    type: String,
    enum: ['mcq', 'short-answer', 'long-answer', 'numerical', 'descriptive'],
    required: true
  },
  marks: { type: Number, required: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  options: [String],
  sampleAnswer: String,
  topic: String
});

const assignmentSchema = new Schema<IAssignment>(
  {
    assignmentName: {
      type: String,
      required: [true, 'Assignment name is required'],
      trim: true,
      maxlength: [100, 'Assignment name cannot exceed 100 characters']
    },
    fileName: {
      type: String,
      trim: true
    },
    fileUrl: {
      type: String,
      trim: true
    },
    filePath: {
      type: String,
      trim: true
    },
    dueDate: {
      type: String,
      required: [true, 'Due date is required']
    },
    questions: {
      type: [questionSchema],
      required: [true, 'Questions configuration is required'],
      validate: {
        validator: (arr: Question[]) => arr.length > 0,
        message: 'At least one question type is required'
      }
    },
    additionalInfo: {
      type: String,
      default: '',
      maxlength: [1000, 'Additional info cannot exceed 1000 characters']
    },
    generatedQuestions: {
      type: [generatedQuestionSchema],
      default: []
    },
    questionGenerationStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: null
    },
    questionGenerationError: {
      type: String,
      default: null
    },
    questionGenerationCompletedAt: {
      type: Date,
      default: null
    },
    jobId: {
      type: String,
      default: null
    },
    pdfFilePath: {
      type: String,
      default: null,
      trim: true
    },
    schoolName: {
      type: String,
      default: null,
      trim: true
    },
    location: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);

export { Assignment, IAssignment };
