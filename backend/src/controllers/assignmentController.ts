import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Assignment, IAssignment } from '../models/Assignment';
import { queueQuestionGeneration, getJobStatus } from '../queue/questionGenerationQueue';
import * as fs from 'fs';
import * as path from 'path';
import { generateAndUploadPDFToS3, deletePDFFromS3, generateSignedPdfUrl } from '../services/s3PdfGeneratorService';

const isS3Enabled = (): boolean => process.env.USE_S3 === 'true';

interface CreateAssignmentRequest extends Request {
  file?: Express.Multer.File & { location?: string; bucket?: string };
}

export const createAssignment = async (
  req: CreateAssignmentRequest,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
      return;
    }

    const { assignmentName, dueDate, questions, additionalInfo } = req.body;

    // Parse questions if it's a string
    let parsedQuestions = questions;
    if (typeof questions === 'string') {
      try {
        parsedQuestions = JSON.parse(questions);
      } catch (e) {
        res.status(400).json({
          success: false,
          message: 'Invalid questions format'
        });
        return;
      }
    }

    // Create assignment object
    const assignmentData: Partial<IAssignment> = {
      assignmentName,
      dueDate,
      questions: parsedQuestions,
      additionalInfo: additionalInfo || '',
      questionGenerationStatus: 'pending'
    };

    // Add file information if file was uploaded
    if (req.file) {
      assignmentData.fileName = req.file.originalname;
      const useS3 = isS3Enabled();
      
      if (useS3 && req.file.location) {
        // S3 Storage - use S3 URL directly
        assignmentData.filePath = req.file.location;
        assignmentData.fileUrl = req.file.location;
      } else {
        // Local Storage - use relative path
        assignmentData.filePath = req.file.path;
        assignmentData.fileUrl = `/uploads/${req.file.filename}`;
      }
    }

    // Save to database
    const assignment = new Assignment(assignmentData);
    await assignment.save();

    // Queue question generation job with extracted parameters from frontend data
    try {
      // Extract question generation parameters from frontend data
      const topic = assignmentName || 'General';
      const subject = additionalInfo?.split('\n')[0] || 'General';
      
      // Calculate total question count from questions array
      const questionCount = parsedQuestions?.reduce((total: number, q: any) => total + (q.count || 0), 0) || 10;
      
      // Extract marks values from questions
      const marks = parsedQuestions
        ?.filter((q: any) => q.marks && q.marks > 0)
        .map((q: any) => q.marks)
        .filter((value: number, index: number, self: number[]) => self.indexOf(value) === index) || [];

      const job = await queueQuestionGeneration({
        assignmentId: assignment._id.toString(),
        topic,
        subject,
        questionCount,
        marks: marks.length > 0 ? marks : undefined,
        difficulty: 'mixed',
        filePath: assignmentData.filePath,
        additionalContext: additionalInfo
      });

      // Update assignment with job ID
      assignment.jobId = job.id?.toString();
      await assignment.save();

      console.log(`Question generation job queued: ${job.id} for assignment ${assignment._id}`);
    } catch (queueError) {
      console.error('Error queuing question generation:', queueError);
      // Don't fail the assignment creation, just log the error
    }

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: {
        ...assignment.toObject(),
        questionGenerationQueued: true
      }
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating assignment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAssignments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAssignmentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateAssignment = async (
  req: CreateAssignmentRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignmentName, dueDate, questions, additionalInfo } = req.body;

    const assignment = await Assignment.findByIdAndUpdate(
      id,
      {
        assignmentName,
        dueDate,
        questions,
        additionalInfo
      },
      { new: true, runValidators: true }
    );

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating assignment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteAssignment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findByIdAndDelete(id);
    
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting assignment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get question generation status
 */
export const getQuestionStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
      return;
    }

    // If there's a job ID, get the job status
    let jobStatus = null;
    if (assignment.jobId) {
      jobStatus = await getJobStatus(assignment.jobId);
    }

    res.status(200).json({
      success: true,
      data: {
        assignmentId: assignment._id,
        status: assignment.questionGenerationStatus,
        error: assignment.questionGenerationError,
        completedAt: assignment.questionGenerationCompletedAt,
        jobStatus,
        questionsCount: assignment.generatedQuestions?.length || 0
      }
    });
  } catch (error) {
    console.error('Error getting question status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting question status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get generated questions
 */
export const getGeneratedQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
      return;
    }

    if (!assignment.generatedQuestions || assignment.generatedQuestions.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No questions generated yet',
        data: {
          questions: [],
          status: assignment.questionGenerationStatus
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        questions: assignment.generatedQuestions,
        totalCount: assignment.generatedQuestions.length,
        status: assignment.questionGenerationStatus,
        completedAt: assignment.questionGenerationCompletedAt
      }
    });
  } catch (error) {
    console.error('Error getting generated questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting generated questions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Regenerate questions for an assignment
 */
export const regenerateQuestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { topic, subject, questionCount, difficulty, additionalContext } = req.body;

    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
      return;
    }

    // Queue new question generation job
    try {
      const job = await queueQuestionGeneration({
        assignmentId: assignment._id.toString(),
        topic: topic || 'General',
        subject: subject || 'General',
        questionCount: questionCount || 10,
        marks: assignment.questions?.map((q: any) => q.marks) || undefined,
        difficulty: difficulty || 'mixed',
        filePath: assignment.filePath,
        additionalContext: additionalContext || assignment.additionalInfo
      });

      // Update assignment status and job ID
      assignment.questionGenerationStatus = 'pending';
      assignment.jobId = job.id?.toString();
      await assignment.save();

      res.status(200).json({
        success: true,
        message: 'Question regeneration job queued',
        data: {
          jobId: job.id,
          assignmentId: assignment._id
        }
      });
    } catch (queueError) {
      throw new Error(`Failed to queue regeneration: ${queueError instanceof Error ? queueError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error regenerating questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating questions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Download question PDF
 */
export const downloadQuestionPDF = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
      return;
    }

    if (!assignment.pdfFilePath) {
      res.status(404).json({
        success: false,
        message: 'PDF not generated yet for this assignment'
      });
      return;
    }

    const useS3 = isS3Enabled();
    if (useS3) {
      const safeName = assignment.assignmentName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const signedDownloadUrl = await generateSignedPdfUrl(assignment.pdfFilePath, {
        expiresSeconds: 15 * 60,
        downloadFileName: `questions_${safeName}.pdf`
      });

      res.redirect(signedDownloadUrl);
    } else {
      // For local storage, stream the file
      const fileName = path.basename(assignment.pdfFilePath);
      const filePath = path.join(__dirname, '../../uploads', fileName);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'PDF file not found on server'
        });
        return;
      }

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="questions_${assignment.assignmentName}.pdf"`
      );

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading PDF',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get PDF file path (for viewing in iframe)
 */
export const getPDFPath = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
      return;
    }

    if (!assignment.pdfFilePath) {
      res.status(404).json({
        success: false,
        message: 'PDF not generated yet for this assignment'
      });
      return;
    }

    const useS3 = isS3Enabled();
    let pdfPath = assignment.pdfFilePath;

    if (useS3) {
      pdfPath = await generateSignedPdfUrl(assignment.pdfFilePath, {
        expiresSeconds: 15 * 60
      });
    }

    res.status(200).json({
      success: true,
      data: {
        pdfPath,
        assignmentName: assignment.assignmentName
      }
    });
  } catch (error) {
    console.error('Error getting PDF path:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting PDF path',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
