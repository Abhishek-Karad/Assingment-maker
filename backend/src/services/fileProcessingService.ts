import fs from 'fs';
import path from 'path';
// @ts-ignore
import pdfParse from 'pdf-parse';
import sharp from 'sharp';

interface FileContent {
  text: string;
  fileType: 'pdf' | 'image' | 'text';
  fileName: string;
}

/**
 * Extract text from PDF files
 */
export const extractPdfContent = async (filePath: string): Promise<string> => {
  try {
    // Read file as buffer (pdf-parse requires buffer, not stream)
    const fileBuffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error(`Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract text from image using Gemini Vision API
 * Note: For local images, we'll convert to base64 for Gemini API
 */
export const extractImageContent = async (filePath: string): Promise<string> => {
  try {
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypeMap: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    
    const mimeType = mimeTypeMap[ext] || 'image/jpeg';
    
    return JSON.stringify({
      type: 'image',
      mimeType,
      data: base64Image,
      filePath
    });
  } catch (error) {
    console.error('Error extracting image content:', error);
    throw new Error(`Failed to extract image content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract text from text files
 */
export const extractTextContent = async (filePath: string): Promise<string> => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error extracting text content:', error);
    throw new Error(`Failed to extract text content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get file type from file path
 */
export const getFileType = (filePath: string): 'pdf' | 'image' | 'text' => {
  const ext = path.extname(filePath).toLowerCase();
  
  const pdfExtensions = ['.pdf'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'];
  const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml'];
  
  if (pdfExtensions.includes(ext)) return 'pdf';
  if (imageExtensions.includes(ext)) return 'image';
  if (textExtensions.includes(ext)) return 'text';
  
  // Default to text if unknown
  return 'text';
};

/**
 * Process file based on its type and extract content
 */
export const processFile = async (filePath: string): Promise<FileContent> => {
  try {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileType = getFileType(filePath);
    const fileName = path.basename(filePath);
    
    let text: string;
    
    switch (fileType) {
      case 'pdf':
        text = await extractPdfContent(filePath);
        break;
      case 'image':
        text = await extractImageContent(filePath);
        break;
      case 'text':
        text = await extractTextContent(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // Truncate extremely long content for Gemini API (typically has token limits)
    // Keep first 10000 characters (roughly 2500 tokens)
    const maxLength = 10000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '\n... [content truncated]';
    }
    
    return {
      text,
      fileType,
      fileName
    };
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};

/**
 * Validate file size and type
 */
export const validateFile = (filePath: string, maxSizeMB: number = 50): boolean => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileSize = fs.statSync(filePath).size;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (fileSize > maxSizeBytes) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }
    
    const fileType = getFileType(filePath);
    const supportedTypes = ['pdf', 'image', 'text'];
    
    if (!supportedTypes.includes(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    return true;
  } catch (error) {
    console.error('File validation error:', error);
    throw error;
  }
};
