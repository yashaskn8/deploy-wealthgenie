import crypto from 'crypto';

/**
 * Middleware to generate or forward X-Correlation-ID.
 * Guarantees that every request has a trace token available on req.correlationId.
 */
export const correlationIdMiddleware = (req, res, next) => {
  const cid = req.headers['x-correlation-id'] || req.headers['x-request-id'] || crypto.randomUUID();
  req.correlationId = cid;
  
  // Forward in request headers for routing/logs
  req.headers['x-correlation-id'] = cid;
  
  // Return in response headers
  res.setHeader('X-Correlation-ID', cid);
  next();
};
