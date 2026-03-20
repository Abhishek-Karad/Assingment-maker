import multer from 'multer';
import customS3Storage from '../config/customS3Storage';
import { Request } from 'express';

// Determine storage based on environment - read directly from process.env
const useS3 = process.env.USE_S3 === 'true';

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
  }
};

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '20971520', 10);

// FORCE S3 ONLY - NO LOCAL FALLBACK
if (!useS3) {
  throw new Error(
    '❌ CRITICAL: S3 upload is required but USE_S3 is not enabled.\n' +
    'Please set USE_S3=true in your .env file.\n' +
    'For production, you MUST use AWS S3 for file uploads.'
  );
}

// Use custom S3 storage with SDK v2
const upload = multer({
  storage: customS3Storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize
  }
});

export default upload;
export { useS3 };
