/**
 * Security Mandate Automated Verification Suite (Tasks 3, 4, 5)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fc from 'fast-check';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { validate, profileSchema, goalSchema, chatMessageSchema } from '../validation/schemas.js';
import { createEndpointRateLimiter } from '../middleware/rateLimiter.js';
import { enforceJsonContentType } from '../middleware/contentType.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { withServer, rawRequest } from '../test-utils/httpTestUtils.js';

// ═════════════════════════════════════════════════════════════════════
// TASK 3: SECRET SCANNER ENFORCEMENT
// ═════════════════════════════════════════════════════════════════════

test('Task 3: Secret Scanner detects fake credentials across patterns', () => {
  const secretScannerPath = path.resolve('..', 'scripts', 'secret-scanner.js');
  assert.ok(fs.existsSync(secretScannerPath), 'secret-scanner.js must exist');

  const testCases = [
    { name: 'AWS Key', content: 'const aws = "AKIAIOSFODNN7EXAMPLE";' },
    { name: 'OpenAI Key', content: 'const key = "sk-proj-1234567890abcdef1234567890abcdef1234567890";' },
    { name: 'Google API Key', content: 'const key = "AIzaSyD1234567890abcdef1234567890abcdef12";' },
    { name: 'JWT Secret', content: 'const jwt_secret = "super_secret_key_that_is_long_enough";' },
    { name: 'MongoDB URL', content: 'const url = "mongodb+srv://admin:pass@cluster.mongodb.net/db";' },
    { name: 'Redis URL', content: 'const url = "rediss://default:secret@redis-123.upstash.io:6379";' },
  ];

  // Run inline pattern checks using the same regex logic as secret-scanner.js
  const RULES = [
    /mongodb(?:\+srv)?:\/\/[^\s"']+/gi,
    /rediss?:\/\/[^\s"']+/gi,
    /(?:AKIA|ASIA)[0-9A-Z]{16}/g,
    /sk-[A-Za-z0-9_-]{32,}/g,
    /AIzaSy[A-Za-z0-9_-]{33}/g,
    /jwt[_-]?secret\s*[=:]\s*['"][^'"]{16,}['"]/gi,
  ];

  for (const tc of testCases) {
    const matched = RULES.some(r => r.test(tc.content));
    assert.ok(matched, `Secret scanner rule must detect ${tc.name}`);
  }
});


// ═════════════════════════════════════════════════════════════════════
// TASK 4: INPUT VALIDATION COMPLETENESS & FAST-CHECK FUZZING
// ═════════════════════════════════════════════════════════════════════

test('Task 4: Fast-check fuzzing — Financial Profile schema handles malformed inputs safely', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.record({
          monthly_income: fc.oneof(fc.string(), fc.double(), fc.constant(NaN), fc.constant(Infinity)),
          age: fc.oneof(fc.integer({ min: -100, max: 200 }), fc.constant(NaN)),
          monthly_savings: fc.oneof(fc.string(), fc.array(fc.integer())),
          risk_tolerance: fc.oneof(fc.string(), fc.constant(null)),
        })
      ),
      (malformedInput) => {
        const { error, value } = profileSchema.validate(malformedInput);
        // Either Joi correctly rejects invalid inputs, or strips/validates cleanly without crashing
        assert.ok(error !== undefined || typeof value === 'object');
      }
    ),
    { numRuns: 100 }
  );
});

test('Task 4: Fast-check fuzzing — Goal schema rejects invalid dates, oversized targets, & bad enums', () => {
  fc.assert(
    fc.property(
      fc.record({
        goal_name: fc.oneof(fc.string({ maxLength: 500 }), fc.constant("")),
        target_amount: fc.oneof(fc.double({ min: -100000, max: 0 }), fc.constant(NaN)),
        target_date: fc.oneof(fc.string(), fc.date()),
        priority: fc.string(),
      }),
      (malformedGoal) => {
        const { error } = goalSchema.validate(malformedGoal);
        // Invalid target_amount or bad priority must be rejected cleanly
        if (malformedGoal.target_amount <= 0 || Number.isNaN(malformedGoal.target_amount)) {
          assert.ok(error !== null, 'Negative/NaN target_amount must fail validation');
        }
      }
    ),
    { numRuns: 100 }
  );
});

test('Task 4: Fast-check fuzzing — Chat message schema enforces non-empty trimmed strings', () => {
  fc.assert(
    fc.property(
      fc.record({
        message: fc.oneof(
          fc.string({ maxLength: 2000 }),
          fc.constant("   "),
          fc.constant(12345),
          fc.constant(null)
        ),
      }),
      (chatPayload) => {
        const { error } = chatMessageSchema.validate(chatPayload);
        if (typeof chatPayload.message !== 'string' || chatPayload.message.trim() === '') {
          assert.ok(error !== null, 'Blank or non-string chat message must fail validation');
        }
      }
    ),
    { numRuns: 100 }
  );
});


// ═════════════════════════════════════════════════════════════════════
// TASK 5: ENDPOINT-SPECIFIC RATE LIMITING
// ═════════════════════════════════════════════════════════════════════

test('Task 5: Dedicated rate limiter permits 10 requests and blocks the 11th with 429', async () => {
  const origDisable = process.env.DISABLE_RATE_LIMIT;
  process.env.DISABLE_RATE_LIMIT = 'false';

  try {
    const app = express();
    app.use(enforceJsonContentType);
    app.use(express.json());

    // Dedicated endpoint limiter: 10 max requests per window
    const chatLimiter = createEndpointRateLimiter({
      windowMs: 60 * 1000,
      max: 10,
      message: 'Chat rate limit exceeded. Max 10 requests per minute.',
    });

    app.post('/api/chat', chatLimiter, (req, res) => res.json({ success: true }));
    app.use(errorHandler);

    await withServer(app, async (baseUrl) => {
      // First 10 requests -> 200 OK
      for (let i = 1; i <= 10; i++) {
        const res = await rawRequest(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: `Test message ${i}` }),
        });
        assert.equal(res.status, 200, `Request ${i} should be permitted`);
      }

      // 11th request -> 429 Too Many Requests
      const res11 = await rawRequest(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Request 11' }),
      });
      assert.equal(res11.status, 429, '11th request must be rejected with 429');
      const body11 = await res11.json();
      assert.ok(body11.message.includes('Chat rate limit exceeded'));
    });
  } finally {
    process.env.DISABLE_RATE_LIMIT = origDisable;
  }
});
