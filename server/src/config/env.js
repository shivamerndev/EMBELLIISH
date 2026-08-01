import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const bool = (value, fallback = false) =>
  value === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/embellish_erp',
  /** Run against a throwaway in-process MongoDB — for demos and local dev only. */
  useMemoryDb: bool(process.env.USE_MEMORY_DB, false),
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_embellish_erp',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.AWS_S3_BUCKET,
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

// A default signing key is fine on a laptop and unacceptable anywhere else.
if (env.nodeEnv === 'production' && env.jwtSecret === 'default_jwt_secret_embellish_erp') {
  throw new Error('JWT_SECRET must be set to a real secret in production');
}

export default env;
