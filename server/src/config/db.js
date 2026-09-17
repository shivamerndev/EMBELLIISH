import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';
import registerModels from '../core/registerModels.js';
import dns from "dns"
dns.setServers(["8.8.8.8"])

export const connectDB = async () => {
  registerModels();

  const options = {
    serverSelectionTimeoutMS: 5000,
  };

  try {
    const conn = await mongoose.connect(env.mongoUri, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.warn(`Primary MongoDB Connection Error (${error.message}).`);

    const localUri = 'mongodb://127.0.0.1:27017/embelliish';
    if (env.nodeEnv === 'development' && env.mongoUri !== localUri) {
      try {
        logger.info(`Falling back to local MongoDB instance: ${localUri}`);
        const conn = await mongoose.connect(localUri, options);
        logger.info(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
        return;
      } catch (fallbackError) {
        logger.error(`Local MongoDB Fallback Error: ${fallbackError.message}`);
      }
    }

    // In-memory MongoDB fallback for seamless development experience
    if (env.nodeEnv === 'development') {
      try {
        logger.info('Falling back to in-memory MongoDB server...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const memoryUri = mongoServer.getUri();
        const conn = await mongoose.connect(memoryUri);
        logger.info(`MongoDB Connected (Memory DB Fallback): ${conn.connection.host}`);
        return;
      } catch (memError) {
        logger.error(`Memory DB Fallback Error: ${memError.message}`);
      }
    }

    logger.error(`MongoDB Connection Failed: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error(`MongoDB Disconnection Error: ${error.message}`);
  }
};

export default connectDB;