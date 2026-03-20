import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedQuestion {
  id: string;
  text: string;
  type: 'mcq' | 'short-answer' | 'long-answer' | 'numerical' | 'descriptive';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  sampleAnswer?: string;
  topic?: string;
}

interface PDFGenerationParams {
  assignmentName: string;
  dueDate: string;
  questions: GeneratedQuestion[];
  subject?: string;
  topic?: string;
  outputPath: string;
  schoolName?: string;
  location?: string;
  class?: string;
  timeAllowed?: string;
}

/**
 * Generate a professional, clean PDF question paper with optimized formatting
 */
export const generateQuestionPDF = async (
  params: PDFGenerationParams
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const {
        assignmentName,
        dueDate,
        questions,
        subject,
        topic,
        outputPath,
        schoolName = 'Your School Name',
        location = 'Location',
        class: className = 'Class',
        timeAllowed = '45 minutes'
      } = params;

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Create PDF document with optimized margins
      const doc = new PDFDocument({ margin: 35, size: 'A4' });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // ===== HEADER SECTION =====
      doc.fontSize(14).font('Helvetica-Bold').text(schoolName, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(location, { align: 'center' });
      doc.moveDown(0.3);

      // Thin separator line
      doc.moveTo(35, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.4);

      // Subject and Class info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Subject: ${subject || 'General'}`, 35);
      doc.text(`Class: ${className}`, 300);
      
      doc.text(`Time Allowed: ${timeAllowed}`, 35);
      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      doc.text(`Maximum Marks: ${totalMarks}`, 300);

      doc.moveDown(0.5);

      // ===== INSTRUCTIONS SECTION =====
      doc.fontSize(10).font('Helvetica-Bold').text('Important Instructions:', 35);
      doc.fontSize(8).font('Helvetica');
      doc.moveDown(0.2);
      doc.text('• All questions are compulsory unless stated otherwise.', { indent: 15 });
      doc.text('• Marks are indicated for each question.', { indent: 15 });
      doc.text('• Show all working for numerical questions.', { indent: 15 });
      doc.text('• Use clear and legible handwriting.', { indent: 15 });

      doc.moveDown(0.5);

      // ===== STUDENT DETAILS SECTION =====
      doc.fontSize(9).font('Helvetica');
      doc.text('Name: _____________________________', 35);
      doc.text('Roll Number: _____________________________', 300);
      doc.text('Class/Section: _____________________________', 35);

      doc.moveDown(0.8);

      // ===== QUESTIONS SECTION =====
      const questionsByType = groupQuestionsByType(questions);
      const sectionLabels: Record<string, string> = {
        mcq: 'Section A: Multiple Choice Questions',
        'short-answer': 'Section B: Short Answer Questions',
        'long-answer': 'Section C: Long Answer Questions',
        numerical: 'Section D: Numerical Questions',
        descriptive: 'Section E: Descriptive/Essay Questions'
      };

      const sectionOrder = ['mcq', 'short-answer', 'long-answer', 'numerical', 'descriptive'];
      let questionNumber = 1;

      for (const type of sectionOrder) {
        const typeQuestions = questionsByType[type];
        
        // Skip empty sections
        if (!typeQuestions || typeQuestions.length === 0) continue;

        // Section header
        doc.fontSize(11).font('Helvetica-Bold').text(sectionLabels[type], 35);
        doc.moveDown(0.2);

        // Section instructions
        doc.fontSize(8).font('Helvetica').fillColor('#555555');
        const marksPerQuestion = typeQuestions[0].marks;
        doc.text(`Attempt all questions. Each question carries ${marksPerQuestion} mark(s).`, { indent: 15 });
        doc.fillColor('#000000');

        doc.moveDown(0.4);

        // Render questions
        typeQuestions.forEach((question) => {
          // Page break logic
          if (doc.y > 730) {
            doc.addPage();
            doc.moveDown(0.5);
          }

          // Question number and text
          doc.fontSize(9).font('Helvetica');
          const questionText = `${questionNumber}. ${question.text}`;
          doc.text(questionText, 40, doc.y, { width: 450, align: 'left' });

          // Marks indicator
          doc.fontSize(8).font('Helvetica').fillColor('#777777');
          doc.text(`[${question.marks} marks]`, { indent: 20 });
          doc.fillColor('#000000');

          // MCQ Options
          if (question.type === 'mcq' && question.options) {
            doc.fontSize(8).font('Helvetica');
            doc.moveDown(0.25);
            question.options.forEach((option, idx) => {
              const letters = ['A', 'B', 'C', 'D'];
              doc.text(`${letters[idx]}) ${option}`, { indent: 40 });
            });
            doc.moveDown(0.6);
          } else {
            doc.moveDown(0.7);
          }

          questionNumber++;
        });

        doc.moveDown(0.4);
      }

      // ===== ANSWER KEY PAGE =====
      doc.addPage();
      
      doc.fontSize(13).font('Helvetica-Bold').text('ANSWER KEY', { align: 'center' });
      doc.moveDown(0.3);
      doc.moveTo(35, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);

      questionNumber = 1;
      for (const type of sectionOrder) {
        const typeQuestions = questionsByType[type];
        
        if (!typeQuestions || typeQuestions.length === 0) continue;

        doc.fontSize(10).font('Helvetica-Bold').text(sectionLabels[type], 35);
        doc.moveDown(0.3);

        typeQuestions.forEach((question) => {
          if (doc.y > 750) {
            doc.addPage();
            doc.moveDown(0.5);
          }

          doc.fontSize(9).font('Helvetica-Bold').text(`Q${questionNumber}:`, 40);
          
          if (question.type === 'mcq' && question.options) {
            // For MCQ, show the answer option
            doc.fontSize(8).font('Helvetica');
            doc.text(`${question.sampleAnswer || 'Answer'}`, { indent: 20 });
          } else {
            // For other types, show the answer
            doc.fontSize(8).font('Helvetica');
            const answerText = question.sampleAnswer || 'Refer to curriculum guidelines';
            doc.text(answerText, { indent: 20, width: 450 });
          }

          doc.moveDown(0.5);
          questionNumber++;
        });

        doc.moveDown(0.3);
      }

      // Footer
      doc.moveDown(0.8);
      doc.fontSize(8).fillColor('#999999');
      doc.text('--- End of Question Paper ---', { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Group questions by type for organized section creation
 */
const groupQuestionsByType = (
  questions: GeneratedQuestion[]
): Record<string, GeneratedQuestion[]> => {
  const grouped: Record<string, GeneratedQuestion[]> = {
    mcq: [],
    'short-answer': [],
    'long-answer': [],
    numerical: [],
    descriptive: []
  };

  questions.forEach((question) => {
    if (grouped[question.type]) {
      grouped[question.type].push(question);
    }
  });

  return grouped;
};