/**
 * Middleware to enforce Content-Type: application/json for POST, PUT, and PATCH requests.
 * Rejects requests with invalid or missing Content-Type headers with 415 Unsupported Media Type.
 */
export const enforceJsonContentType = (req, res, next) => {
  const method = req.method;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = req.headers['content-type'];
    
    // Check if header is present and starts with application/json
    if (!contentType || !contentType.toLowerCase().startsWith('application/json')) {
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
};
