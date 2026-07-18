import { getCache, setCache, setCacheNX, delCache, redisAvailable } from '../config/redis.js';

const memoryCache = new Map();

/**
 * Idempotency Key middleware for preventing duplicate form submissions and double writes.
 * Supports a short TTL (5 minutes default) for successful responses.
 * Uses atomic SET NX to prevent race conditions under concurrent requests.
 */
export const idempotency = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) {
      return next();
    }

    // Standardize key by user (to prevent key collision between different users)
    const userId = req.user?.userId || 'anonymous';
    const cacheKey = `idemp:${userId}:${key}`;

    try {
      if (redisAvailable) {
        // Attempt atomic lock: SET key "LOCK" NX EX 10
        // Returns true only if the key did NOT exist (we acquired the lock).
        const acquired = await setCacheNX(cacheKey, 'LOCK', 10);

        if (!acquired) {
          // Key already exists — either a LOCK or a cached response.
          const cached = await getCache(cacheKey);

          if (!cached || cached === 'LOCK') {
            // Double-click/concurrent request in progress
            return res.status(409).json({
              error: 'Conflict',
              message: 'A duplicate request is already in progress. Please wait.'
            });
          }

          // Return original cached response
          res.status(cached.status);
          if (cached.headers) {
            for (const [hk, hv] of Object.entries(cached.headers)) {
              res.setHeader(hk, hv);
            }
          }
          res.setHeader('X-Cache-Lookup', 'HIT - Idempotent');
          return res.send(cached.body);
        }
        // Lock acquired — proceed to handler
      } else {
        // Memory fallback (non-atomic, acceptable for single-process dev mode)
        const cached = memoryCache.get(cacheKey) || null;

        if (cached) {
          if (cached === 'LOCK') {
            return res.status(409).json({
              error: 'Conflict',
              message: 'A duplicate request is already in progress. Please wait.'
            });
          }
          res.status(cached.status);
          if (cached.headers) {
            for (const [hk, hv] of Object.entries(cached.headers)) {
              res.setHeader(hk, hv);
            }
          }
          res.setHeader('X-Cache-Lookup', 'HIT - Idempotent');
          return res.send(cached.body);
        }

        memoryCache.set(cacheKey, 'LOCK');
        setTimeout(() => {
          if (memoryCache.get(cacheKey) === 'LOCK') {
            memoryCache.delete(cacheKey);
          }
        }, 10000);
      }

      // 3. Intercept res.send/res.json to save response
      const originalSend = res.send;
      res.send = function (body) {
        // Only cache successful status codes (2xx) to allow retries on error
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseData = {
            status: res.statusCode,
            headers: {
              'content-type': res.getHeader('content-type')
            },
            body: body
          };

          if (redisAvailable) {
            setCache(cacheKey, responseData, ttlSeconds).catch(() => {});
          } else {
            memoryCache.set(cacheKey, responseData);
            setTimeout(() => {
              memoryCache.delete(cacheKey);
            }, ttlSeconds * 1000);
          }
        } else {
          // If response failed, release the lock immediately
          if (redisAvailable) {
            delCache(cacheKey).catch(() => {});
          } else {
            memoryCache.delete(cacheKey);
          }
        }

        return originalSend.apply(this, arguments);
      };

      next();
    } catch (err) {
      console.warn('[Idempotency] Middleware failed (proceeding without safety):', err.message);
      next();
    }
  };
};
