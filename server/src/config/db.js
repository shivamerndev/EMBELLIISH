import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';
import registerModels from '../core/registerModels.js';
import dns from "dns"

dns.setServers(["8.8.8.8"])

export const connectDB = async () => {
  try {
    // Every model has to be known before the first populate crosses a module
    // boundary. The HTTP server gets that for free from the route index, but a
    // script importing one service does not — so it happens here, once, for both.
    registerModels();

    const conn = await mongoose.connect(env.mongoUri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
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