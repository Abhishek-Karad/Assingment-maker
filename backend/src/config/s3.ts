import AWS from 'aws-sdk';

// Initialize S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'assignment-creator';

// Verify S3 credentials on startup
export const verifyS3Connection = async () => {
  try {
    console.log(`🔍 Checking S3 bucket: ${S3_BUCKET_NAME}`);
    console.log(`📍 Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    
    await s3.headBucket({ Bucket: S3_BUCKET_NAME }).promise();
    console.log(`✅ AWS S3 Connection verified. Bucket: ${S3_BUCKET_NAME}`);
  } catch (error: any) {
    console.error('❌ AWS S3 Connection failed. Please verify your AWS credentials.');
    console.error('Error details:', {
      message: error?.message || error,
      code: error?.code,
      statusCode: error?.statusCode,
      bucket: S3_BUCKET_NAME,
      region: process.env.AWS_REGION
    });
    
    // Provide troubleshooting hints
    if (error?.code === 'InvalidBucketName') {
      console.error('⚠️  Bucket name contains invalid characters or format');
    } else if (error?.code === 'NoSuchBucket') {
      console.error('⚠️  Bucket does not exist. Check if you created it in AWS Console');
    } else if (error?.code === 'AccessDenied') {
      console.error('⚠️  Access denied. Check IAM user has S3 permissions');
    } else if (error?.code === 'InvalidAccessKeyId') {
      console.error('⚠️  Invalid AWS Access Key ID. Check your credentials');
    } else if (error?.code === 'SignatureDoesNotMatch') {
      console.error('⚠️  Invalid AWS Secret Access Key. Check your credentials');
    }
  }
};

export default s3;
