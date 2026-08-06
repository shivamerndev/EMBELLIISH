import env from '../config/env.js';
import logger from '../config/logger.js';

/**
 * Where site-visit photos, drawings and installation shots end up.
 *
 * Local disk is the default and is fully working: multer writes into
 * `server/uploads`, which the app serves at `/uploads`. If S3 credentials are
 * configured, files go there instead.
 *
 * The previous placeholder returned a plausible-looking S3 URL without uploading
 * anything, which meant a "saved" photo silently 404ed later.
 */
const s3Configured = () =>
  Boolean(env.aws.bucket && env.aws.accessKeyId && env.aws.secretAccessKey && env.aws.region);

const uploadService = {
  /** Turns a multer file into the attachment shape the schemas expect. */
  toAttachment(file, user) {
    if (!file) return null;
    return {
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: user?.id,
      uploadedAt: new Date(),
    };
  },

  toAttachments(files = [], user) {
    return files.map((file) => this.toAttachment(file, user)).filter(Boolean);
  },

  /** Pushes a local file to S3 when it is configured; otherwise leaves it on disk. */
  async archive(file, user) {
    const baseAttachment = {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: user?.id,
      uploadedAt: new Date(),
    };

    if (!s3Configured()) {
      logger.debug(`[upload] keeping ${file.filename} on local disk (no S3 configured)`);
      return {
        ...baseAttachment,
        url: `/uploads/${file.filename}`,
        storage: 'local',
      };
    }

    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { createReadStream, unlinkSync } = await import('fs');

    const client = new S3Client({
      region: env.aws.region,
      credentials: { accessKeyId: env.aws.accessKeyId, secretAccessKey: env.aws.secretAccessKey },
    });

    const key = `uploads/${file.filename}`;
    await client.send(
      new PutObjectCommand({
        Bucket: env.aws.bucket,
        Key: key,
        Body: createReadStream(file.path),
        ContentType: file.mimetype,
      })
    );

    // Clean up local temp file after uploading to S3
    try {
      unlinkSync(file.path);
    } catch (err) {
      logger.warn(`[upload] failed to remove temp file ${file.path}: ${err.message}`);
    }

    return {
      ...baseAttachment,
      url: `/uploads/${file.filename}`,
      key,
      storage: 's3',
    };
  },
};

export default uploadService;
export { s3Configured };
