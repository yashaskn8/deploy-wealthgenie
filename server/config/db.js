import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

const connectDB = async (retries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        autoIndex: true,
      });
      logger.info('MongoDB connected', { host: conn.connection.host });
      return conn;
    } catch (error) {
      if (attempt === retries) {
        logger.error('MongoDB connection failed after all retries', {
          attempts: retries,
          message: error.message,
        });
        process.exit(1);
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn('MongoDB connection attempt failed, retrying', {
        attempt,
        maxRetries: retries,
        nextRetryMs: delay,
        message: error.message,
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;
