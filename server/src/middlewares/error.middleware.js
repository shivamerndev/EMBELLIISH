import logger from '../config/logger.js';
import env from '../config/env.js';
import { sendError } from '../utils/responseHandler.js';

/**
 * Turns anything thrown anywhere into one response shape.
 *
 * Database-level failures are translated into the message the user needed in the
 * first place — a duplicate key becomes "a project with this code already
 * exists", not a raw E11000 dump.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || null;

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((issue) => ({
      field: issue.path,
      message: issue.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `A record with this ${field} already exists`;
    errors = [{ field, message }];
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues?.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please sign in again.';
  } else if (
    err.name === 'MongooseError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.message?.includes('buffering timed out')
  ) {
    statusCode = 503;
    message = 'Database service unavailable. Please check your MongoDB connection.';
  }

  // Genuine faults get a stack trace; expected refusals are just noted.
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.stack || err.message}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} — ${statusCode} ${message}`);
  }

  return sendError(res, message, errors, statusCode, {
    stack: env.nodeEnv === 'development' && statusCode >= 500 ? err.stack : undefined,
  });
};

export default errorMiddleware;
