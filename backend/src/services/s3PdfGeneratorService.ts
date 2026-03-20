import s3, { S3_BUCKET_NAME } from '../config/s3';
import PDFDocument from 'pdfkit';

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
  schoolName?: string;
  location?: string;
  class?: string;
  timeAllowed?: string;
}

const extractS3KeyFromUrl = (s3Url: string): string => {
  const urlPattern = new RegExp(`https://${S3_BUCKET_NAME}\\.s3\\..*\\.amazonaws\\.com/(.*)`);
  const match = s3Url.match(urlPattern);

  if (!match) {
    throw new Error('Invalid S3 URL format');
  }

  return decodeURIComponent(match[1]);
};

/**
 * Generate PDF and upload directly to S3 using AWS SDK v2
 */
export const generateAndUploadPDFToS3 = async (
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
        schoolName = 'Your School Name',
        location = 'Location',
        class: className = 'Class',
        timeAllowed = '45 minutes'
      } = params;

      // Create PDF document
      const doc = new PDFDocument({ margin: 35, size: 'A4' });
      const chunks: Buffer[] = [];

      // Collect PDF chunks
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('error', (error) => {
        reject(error);
      });

      // When document is finished
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          
          // Generate S3 key
          const timestamp = Date.now();
          const sanitizedName = assignmentName.replace(/[^a-zA-Z0-9-_]/g, '_');
          const s3Key = `pdfs/${sanitizedName}-${timestamp}.pdf`;

          // Upload to S3 using AWS SDK v2
          const uploadParams = {
            Bucket: S3_BUCKET_NAME,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: 'application/pdf'
          };

          s3.upload(uploadParams, (err: any, data: any) => {
            if (err) {
              console.error('❌ S3 Upload Error:', err);
              reject(err);
            } else {
              console.log(`✅ PDF uploaded to S3: ${data.Location}`);
              resolve(data.Location); // Return full S3 URL
            }
          });

        } catch (uploadError) {
          console.error('❌ Error processing PDF for upload:', uploadError);
          reject(uploadError);
        }
      });

      // ===== PDF CONTENT =====
      
      // HEADER SECTION
      doc.fontSize(14).font('Helvetica-Bold').text(schoolName, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(location, { align: 'center' });
      doc.moveDown(0.3);

      // Separator line
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

      // INSTRUCTIONS SECTION
      doc.fontSize(10).font('Helvetica-Bold').text('Important Instructions:', 35);
      doc.fontSize(8).font('Helvetica');
      doc.moveDown(0.2);
      doc.text('• All questions are compulsory unless stated otherwise.', { indent: 15 });
      doc.text('• Marks are indicated for each question.', { indent: 15 });
      doc.text('• Show all working for numerical questions.', { indent: 15 });
      doc.text('• Use clear and legible handwriting.', { indent: 15 });

      doc.moveDown(0.5);

      // STUDENT DETAILS SECTION
      doc.fontSize(9).font('Helvetica');
      doc.text('Name: _____________________________', 35);
      doc.text('Roll Number: _____________________________', 300);
      doc.text('Class/Section: _____________________________', 35);

      doc.moveDown(0.8);

      // QUESTIONS SECTION
      doc.fontSize(11).font('Helvetica-Bold').text('Questions:', 35);
      doc.moveDown(0.3);

      questions.forEach((question, index) => {
        const questionNumber = index + 1;
        
        // Question header
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`Q${questionNumber}. [${question.marks} marks]`, 35, doc.y);
        
        // Question text
        doc.fontSize(9).font('Helvetica');
        doc.text(question.text, { indent: 20, width: 460 });

        // MCQ Options
        if (question.type === 'mcq' && question.options) {
          doc.moveDown(0.2);
          question.options.forEach((option, optIndex) => {
            const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D
            doc.fontSize(8).text(`${optionLabel}) ${option}`, { indent: 30, width: 450 });
          });
        }

        doc.moveDown(0.5);

        // Page break if needed
        if (doc.y > 700) {
          doc.addPage();
        }
      });

      // End the document
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Delete PDF from S3
 */
export const deletePDFFromS3 = async (s3Url: string): Promise<void> => {
  try {
    const key = extractS3KeyFromUrl(s3Url);
    
    const deleteParams = {
      Bucket: S3_BUCKET_NAME,
      Key: key
    };

    s3.deleteObject(deleteParams, (err: any, data: any) => {
      if (err) {
        console.error('❌ Error deleting PDF from S3:', err);
        throw err;
      }
      console.log(`✅ PDF deleted from S3: ${key}`);
    });
  } catch (error) {
    console.error('Error deleting PDF from S3:', error);
    throw error;
  }
};

/**
 * Generate a time-limited signed URL for private S3 PDFs.
 */
export const generateSignedPdfUrl = async (
  s3Url: string,
  options?: {
    expiresSeconds?: number;
    downloadFileName?: string;
  }
): Promise<string> => {
  try {
    const key = extractS3KeyFromUrl(s3Url);
    const expires = options?.expiresSeconds || 15 * 60;

    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Expires: expires,
      ...(options?.downloadFileName
        ? {
            ResponseContentDisposition: `attachment; filename=\"${options.downloadFileName}\"`
          }
        : {})
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed PDF URL:', error);
    throw error;
  }
};
