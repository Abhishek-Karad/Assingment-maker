import { Router } from 'express';
import { body } from 'express-validator';
import upload from '../middleware/multer';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getQuestionStatus,
  getGeneratedQuestions,
  regenerateQuestions,
  downloadQuestionPDF,
  getPDFPath
} from '../controllers/assignmentController';

const router = Router();

// Validation middleware
const validateAssignment = [
  body('assignmentName')
    .trim()
    .notEmpty()
    .withMessage('Assignment name is required')
    .isLength({ max: 100 })
    .withMessage('Assignment name cannot exceed 100 characters'),
  
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required'),
  
  body('questions')
    .custom((value) => {
      let parsed = value;
      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value);
        } catch (e) {
          throw new Error('Invalid questions format');
        }
      }
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('At least one question type is required');
      }
      
      return true;
    })
];

// Routes
router.post(
  '/create',
  upload.single('file'),
  validateAssignment,
  createAssignment
);

router.get('/all', getAssignments);

// Specific routes (must come before generic /:id route)
router.get('/:id/question-status', getQuestionStatus);
router.get('/:id/questions', getGeneratedQuestions);
router.get('/:id/pdf-path', getPDFPath);
router.get('/:id/download-pdf', downloadQuestionPDF);

router.post(
  '/:id/regenerate-questions',
  regenerateQuestions
);

// Generic routes (must come after specific routes)
router.get('/:id', getAssignmentById);

router.put(
  '/:id',
  validateAssignment,
  updateAssignment
);

router.delete('/:id', deleteAssignment);

export default router;
