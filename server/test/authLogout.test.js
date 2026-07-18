import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import authRoutes from '../routes/auth.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { errorHandler } from '../middleware/errorHandler.js';

process.env.JWT_SECRET = 'logout-integration-test-secret';
process.env.NODE_ENV = 'test';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  
  // A simple protected test endpoint
  app.get('/api/protected', verifyJWT, (req, res) => {
    res.json({ message: 'Success', user: req.user });
  });

  app.use(errorHandler);
  return app;
}

async function withServer(fn) {
  const server = buildApp().listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'connection': 'close',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

test('JWT logout revokes token and blocks subsequent access', async () => {
  await withServer(async (baseUrl) => {
    const jti = 'test-uuid-jti-12345';
    // 1. Directly sign a valid token
    const token = jwt.sign(
      { userId: '64b000000000000000000001', email: 'test@example.com', jti },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Access protected route - should succeed
    const { response: accRes, body: accBody } = await jsonFetch(`${baseUrl}/api/protected`, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(accRes.status, 200);
    assert.equal(accBody.message, 'Success');
    assert.equal(accBody.user.jti, jti);

    // 3. Log out - should succeed and add to blacklist
    const { response: logoRes, body: logoBody } = await jsonFetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(logoRes.status, 200);
    assert.match(logoBody.message, /Logout successful/i);

    // 4. Access protected route again - should fail with 401
    const { response: failRes, body: failBody } = await jsonFetch(`${baseUrl}/api/protected`, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(failRes.status, 401);
    assert.match(failBody.error, /revoked/i);
  });
});
