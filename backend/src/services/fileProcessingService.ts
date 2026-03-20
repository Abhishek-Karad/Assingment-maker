import fs from 'fs';
import path from 'path';
// @ts-ignore
import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import s3 from '../config/s3';

interface FileContent {
  text: string;
  fileType: 'pdf' | 'image' | 'text';
  fileName: string;
}

const isRemoteUrl = (filePath: string): boolean => /^https?:\/\//i.test(filePath);

const extractS3KeyFromUrl = (fileUrl: string): string | null => {
  try {
    const parsedUrl = new URL(fileUrl);

    if (!parsedUrl.hostname.includes('amazonaws.com')) {
      return null;
    }

    return decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
};

const readFileToBuffer = async (filePath: string): Promise<Buffer> => {
  if (!isRemoteUrl(filePath)) {
    return fs.promises.readFile(filePath);
  }

  const s3Key = extractS3KeyFromUrl(filePath);

  // Prefer S3 SDK for private buckets and signed access through AWS credentials.
  if (s3Key) {
    try {
      const headResult = await s3
        .headObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME || 'assignment-creator',
          Key: s3Key
        })
        .promise();

      if (typeof headResult.ContentLength === 'number' && headResult.ContentLength <= 0) {
        throw new Error(`Empty S3 object: ${filePath}`);
      }

      const s3Object = await s3
        .getObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME || 'assignment-creator',
          Key: s3Key
        })
        .promise();

      const body = s3Object.Body;
      if (!body) {
        throw new Error(`Empty file content: ${filePath}`);
      }

      if (Buffer.isBuffer(body)) {
        return body;
      }

      if (typeof body === 'string') {
        return Buffer.from(body);
      }

      if (body instanceof Uint8Array) {
        return Buffer.from(body);
      }

      throw new Error(`Unsupported S3 body type for: ${filePath}`);
    } catch (s3Error) {
      console.warn(`S3 SDK read failed, falling back to HTTP fetch for ${filePath}:`, s3Error);
    }
  }

  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Failed to download file (${response.status}): ${filePath}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

/**
 * Extract text from PDF files
 */
export const extractPdfContent = async (filePath: string): Promise<string> => {
  try {
    // Read file as buffer (pdf-parse requires buffer, not stream)
    const fileBuffer = await readFileToBuffer(filePath);
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
    const imageBuffer = await readFileToBuffer(filePath);
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
    const fileBuffer = await readFileToBuffer(filePath);
    const content = fileBuffer.toString('utf-8');
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
    // Verify local file exists, remote URLs are validated through download/head requests.
    if (!isRemoteUrl(filePath) && !fs.existsSync(filePath)) {
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
export const validateFile = async (filePath: string, maxSizeMB: number = 50): Promise<boolean> => {
  try {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    let fileSize = 0;

    if (isRemoteUrl(filePath)) {
      const s3Key = extractS3KeyFromUrl(filePath);

      if (s3Key) {
        try {
          const metadata = await s3
            .headObject({
              Bucket: process.env.AWS_S3_BUCKET_NAME || 'assignment-creator',
              Key: s3Key
            })
            .promise();

          fileSize = metadata.ContentLength || 0;
        } catch (s3Error) {
          console.warn(`S3 metadata lookup failed, falling back to HTTP HEAD for ${filePath}:`, s3Error);
        }
      }

      if (!fileSize) {
        const response = await fetch(filePath, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`File not found: ${filePath}`);
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          fileSize = Number(contentLength) || 0;
        }
      }
    } else {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      fileSize = fs.statSync(filePath).size;
    }
    
    if (fileSize > 0 && fileSize > maxSizeBytes) {
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
