import { Assignment } from '../models/Assignment';
import { processFile, validateFile } from '../services/fileProcessingService';
import { generateQuestions, validateQuestions, GeneratedQuestion } from '../services/geminiService';
import { generateQuestionPDF } from '../services/pdfGeneratorService';
import * as path from 'path';

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
 * Truncate file content to prevent API limits
 */
const truncateFileContent = (content: string, maxLength: number = 5000): string => {
  if (content.length > maxLength) {
    console.warn(`File content truncated from ${content.length} to ${maxLength} characters`);
    return content.substring(0, maxLength) + '\n...[content truncated]';
  }
  return content;
};

/**
 * Parse Gemini response safely, handling markdown code blocks
 */
const parseGeminiResponse = (rawResponse: string): GeneratedQuestion[] => {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
    
    // Handle case where response might be wrapped in extra quotes or have escape sequences
    if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
      cleanedResponse = JSON.parse(cleanedResponse);
    }
    
    const parsed = JSON.parse(cleanedResponse);
    
    // Ensure it's an array
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    } else {
      throw new Error('Response does not contain a questions array');
    }
  } catch (error) {
    throw new Error(
      `Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Invalid JSON format'}`
    );
  }
};

/**
 * Process question generation job
 */
export const processQuestionGenerationJob = async (
  jobData: QuestionGenerationJobData
): Promise<any> => {
  try {
    console.log(`Processing question generation for assignment ${jobData.assignmentId}`);
    console.log(`Job data:`, {
      topic: jobData.topic,
      subject: jobData.subject,
      questionCount: jobData.questionCount,
      difficulty: jobData.difficulty,
      hasFile: !!jobData.filePath
    });

    // Update assignment status to processing
    await Assignment.findByIdAndUpdate(jobData.assignmentId, {
      questionGenerationStatus: 'processing',
      questionGenerationError: null
    });

    let fileContent: string | undefined;

    // Process file if provided
    if (jobData.filePath) {
      console.log(`Processing file: ${jobData.filePath}`);
      
      try {
        validateFile(jobData.filePath);
        const processedFile = await processFile(jobData.filePath);
        fileContent = processedFile.text;
        console.log(`File processed successfully. Original content length: ${fileContent.length}`);
        
        // Truncate to prevent API limits
        fileContent = truncateFileContent(fileContent);
        console.log(`Truncated content length: ${fileContent.length}`);
      } catch (error) {
        console.error('Error processing file:', error);
        throw new Error(
          `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Generate questions using Gemini
    console.log(`Generating ${jobData.questionCount} questions`);
    
    let rawResponse: any;
    try {
      rawResponse = await generateQuestions({
        topic: jobData.topic,
        subject: jobData.subject,
        questionCount: jobData.questionCount,
        marks: jobData.marks,
        difficulty: jobData.difficulty || 'mixed',
        fileContent,
        additionalContext: jobData.additionalContext
      });

      // Log raw response for debugging (first 1000 chars)
      console.log(`Raw Gemini response (first 1000 chars):`, 
        JSON.stringify(rawResponse).substring(0, 1000)
      );
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error(
        `Gemini API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Parse response safely
    let questions: GeneratedQuestion[];
    try {
      questions = parseGeminiResponse(JSON.stringify(rawResponse));
      console.log(`Successfully parsed ${questions.length} questions from response`);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response was:', rawResponse);
      throw parseError;
    }

    // Validate generated questions
    console.log(`Validating ${questions.length} questions...`);
    try {
      validateQuestions(questions);
      console.log(`Successfully validated all ${questions.length} questions`);
    } catch (validationError) {
      console.error('Validation error details:', validationError);
      console.error('Questions that failed validation:', JSON.stringify(questions, null, 2));
      throw validationError;
    }

    console.log(`Successfully generated and validated ${questions.length} questions`);

    // Generate PDF from questions
    console.log(`Generating PDF for assignment ${jobData.assignmentId}`);
    const uploadsDir = path.join(__dirname, '../../uploads');
    const fileName = `questions_${jobData.assignmentId}_${Date.now()}.pdf`;
    const pdfFilePath = path.join(uploadsDir, fileName);

    try {
      // Fetch assignment to get additional details
      const assignment = await Assignment.findById(jobData.assignmentId);

      await generateQuestionPDF({
        assignmentName: jobData.topic,
        dueDate: new Date().toISOString().split('T')[0],
        questions,
        subject: jobData.subject || 'General',
        topic: jobData.topic,
        outputPath: pdfFilePath,
        schoolName: assignment?.schoolName || 'Your School Name',
        location: assignment?.location || 'School Location',
        class: jobData.subject || 'Class',
        timeAllowed: '45 minutes'
      });

      console.log(`PDF generated successfully at ${pdfFilePath}`);
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      throw new Error(
        `PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
      );
    }

    // Update assignment with generated questions and PDF path
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      jobData.assignmentId,
      {
        generatedQuestions: questions,
        questionGenerationStatus: 'completed',
        questionGenerationError: null,
        questionGenerationCompletedAt: new Date(),
        pdfFilePath: `/uploads/${fileName}`
      },
      { new: true }
    );

    console.log(`Assignment ${jobData.assignmentId} updated successfully`);

    return {
      success: true,
      assignmentId: jobData.assignmentId,
      questionsGenerated: questions.length,
      pdfPath: `/uploads/${fileName}`,
      assignment: updatedAssignment
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in question generation job:', error);

    try {
      // Update assignment with error status
      await Assignment.findByIdAndUpdate(jobData.assignmentId, {
        questionGenerationStatus: 'failed',
        questionGenerationError: errorMessage,
        questionGenerationFailedAt: new Date()
      });
      console.log(`Assignment ${jobData.assignmentId} marked as failed`);
    } catch (updateError) {
      console.error('Failed to update assignment with error status:', updateError);
    }

    throw error;
  }
};

/**
 * Retry logic for failed jobs
 */
export const handleJobFailure = async (
  jobData: QuestionGenerationJobData,
  error: Error,
  attempt: number,
  maxAttempts: number
): Promise<void> => {
  console.error(
    `Job failed (attempt ${attempt}/${maxAttempts}): ${error.message}`
  );

  if (attempt >= maxAttempts) {
    // Final failure - update assignment status
    await Assignment.findByIdAndUpdate(jobData.assignmentId, {
      questionGenerationStatus: 'failed',
      questionGenerationError: `Failed after ${maxAttempts} attempts: ${error.message}`,
      questionGenerationFailedAt: new Date()
    });
    
    console.error(`Job permanently failed after ${maxAttempts} attempts for assignment ${jobData.assignmentId}`);
  } else {
    console.log(`Retrying job (attempt ${attempt + 1}/${maxAttempts})...`);
  }
};