import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import routes from './routes/index.js';
import errorMiddleware from './middlewares/error.middleware.js';
import ApiError from './core/ApiError.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { s3Configured } from './services/upload.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl, credentials: true }));

app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Site-visit photos, drawings and installation shots.
app.get('/uploads/*', async (req, res) => {
  const fileRelPath = req.params[0];
  const localPath = path.join(__dirname, '../uploads', fileRelPath.replace(/^uploads\//, ''));

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  if (s3Configured()) {
    try {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: env.aws.region,
        credentials: {
          accessKeyId: env.aws.accessKeyId,
          secretAccessKey: env.aws.secretAccessKey,
        },
      });

      const key = fileRelPath.startsWith('uploads/') ? fileRelPath : `uploads/${fileRelPath}`;
      const command = new GetObjectCommand({
        Bucket: env.aws.bucket,
        Key: key,
      });

      const s3Res = await client.send(command);
      if (s3Res.ContentType) res.setHeader('Content-Type', s3Res.ContentType);
      if (s3Res.ContentLength) res.setHeader('Content-Length', s3Res.ContentLength);
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      return s3Res.Body.pipe(res);
    } catch (err) {
      logger.warn(`[s3-proxy] Failed to fetch ${fileRelPath} from S3: ${err.message}`);
      return res.status(404).send('File not found');
    }
  }

  return res.status(404).send('File not found');
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.json({
    name: 'Embellish ERP API',
    status: 'OK',
    version: 'v1',
    docs: '/api/v1/meta',
  });
});

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const healthy = dbState === 1;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'OK' : 'DEGRADED',
    database: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] ?? 'unknown',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/v1', routes);

app.use((req, res, next) => next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`)));

app.use(errorMiddleware);

export default app;
