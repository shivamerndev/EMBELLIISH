import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'path';
import routes from './routes/index.js';
import errorMiddleware from './middlewares/error.middleware.js';
import ApiError from './core/ApiError.js';
import env from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl, credentials: true }));

app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Site-visit photos, drawings and installation shots.
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
