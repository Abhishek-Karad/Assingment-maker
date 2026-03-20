import s3, { S3_BUCKET_NAME } from './s3';
import { StorageEngine } from 'multer';
import * as path from 'path';

/**
 * Custom Multer Storage Engine for AWS S3 using SDK v2
 * Uploads files directly to S3 on upload
 */
class S3Storage implements StorageEngine {
  _handleFile(
    req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, info?: any) => void
  ): void {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      const key = `uploads/assignments/${name}-${uniqueSuffix}${ext}`;

      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: file.stream,
        ContentType: file.mimetype
      };

      console.log(`📤 Uploading to S3: ${key}`);

      s3.upload(uploadParams, (err: any, data: any) => {
        if (err) {
          console.error(`❌ S3 Upload failed for ${key}:`, err.message);
          return callback(err);
        }

        console.log(`✅ File uploaded to S3: ${data.Location}`);

        // Return file info with S3 location
        callback(null, {
          filename: file.originalname,
          location: data.Location,
          key: key,
          bucket: S3_BUCKET_NAME,
          mimetype: file.mimetype,
          size: file.size,
          path: data.Location // For compatibility
        });
      });
    } catch (error) {
      console.error('❌ Error in S3 upload:', error);
      callback(error as Error);
    }
  }

  _removeFile(
    req: Express.Request,
    file: any,
    callback: (error: Error | null) => void
  ): void {
    try {
      if (!file.key) {
        return callback(null);
      }

      const deleteParams = {
        Bucket: S3_BUCKET_NAME,
        Key: file.key
      };

      s3.deleteObject(deleteParams, (err: any) => {
        if (err) {
          console.error(`❌ Error deleting ${file.key}:`, err.message);
          return callback(err);
        }

        console.log(`✅ Deleted from S3: ${file.key}`);
        callback(null);
      });
    } catch (error) {
      callback(error as Error);
    }
  }
}

export default new S3Storage();
