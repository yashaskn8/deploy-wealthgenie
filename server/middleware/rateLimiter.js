import rateLimit, { MemoryStore } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient, redisAvailable } from '../config/redis.js';

class HybridStore {
  constructor(options = {}) {
    this.options = options;
    this.memoryStore = new MemoryStore();
    this.redisStore = null;
  }

  getStore() {
    if (redisAvailable && redisClient) {
      if (!this.redisStore) {
        this.redisStore = new RedisStore({
          sendCommand: (...args) => redisClient.sendCommand(args),
          prefix: this.options.prefix || 'rl:',
        });
      }
      return this.redisStore;
    }
    return this.memoryStore;
  }

  async increment(key) {
    return this.getStore().increment(key);
  }

  async decrement(key) {
    return this.getStore().decrement(key);
  }

  async resetKey(key) {
    return this.getStore().resetKey(key);
  }

  async resetAll() {
    const store = this.getStore();
    if (store.resetAll) {
      await store.resetAll();
    }
  }
}

// Strict limiter for authentication endpoints (registration, login)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Limit each IP to 10 authentication requests per window
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: new HybridStore({ prefix: 'rl:auth:' }),
  passOnStoreError: true, // Allow request through if both stores fail
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true' && process.env.NODE_ENV !== 'production',
});

// Standard API rate limiter (protects database/CPU resource consumption)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // Limit each IP to 60 API requests per minute
  message: { error: 'Rate limit exceeded.' },
  store: new HybridStore({ prefix: 'rl:api:' }),
  passOnStoreError: true,
  skip: () => process.env.DISABLE_RATE_LIMIT === 'true' && process.env.NODE_ENV !== 'production',
});
