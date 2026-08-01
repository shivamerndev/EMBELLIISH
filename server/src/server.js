import app from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import logger from './config/logger.js';

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info(`Embellish ERP API running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
  });

  // Finish in-flight requests before closing the database.
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled promise rejection: ${reason?.stack || reason}`);
  });

  return server;
};

startServer().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
