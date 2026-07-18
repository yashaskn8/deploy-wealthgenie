import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { closeServer, rawRequest } from '../test-utils/httpTestUtils.js';

test('rate limit middleware blocks requests beyond the configured cap', async (t) => {
  const app = express();
  app.use(rateLimit({ windowMs: 1000, max: 2, standardHeaders: true, legacyHeaders: false }));
  app.get('/limited', (_req, res) => res.json({ ok: true }));

  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await closeServer(server); });

  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/limited`;

  assert.equal((await rawRequest(url)).status, 200);
  assert.equal((await rawRequest(url)).status, 200);
  assert.equal((await rawRequest(url)).status, 429);
});
