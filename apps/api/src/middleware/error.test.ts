import assert from 'node:assert/strict';
import { classifyError, isDbConnectionError } from './error.js';

class FakePgError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

async function testRecognizesECONNREFUSED() {
  const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
  assert.equal(isDbConnectionError(err), true);
  assert.equal(classifyError(err).status, 503);
}

async function testRecognizesPostgresSqlState() {
  for (const code of ['08000', '08001', '08006', '57P01', '57P03']) {
    const err = new FakePgError(`pg ${code}`, code);
    assert.equal(isDbConnectionError(err), true, `code ${code} should be classified as connection error`);
    assert.equal(classifyError(err).status, 503);
  }
}

async function testIgnoresUnrelatedCodes() {
  const err = new FakePgError('column does not exist', '42703');
  assert.equal(isDbConnectionError(err), false);
  assert.equal(classifyError(err).status, 500);
}

async function testIgnoresErrorWithoutCode() {
  const err = new Error('boom');
  assert.equal(isDbConnectionError(err), false);
  assert.equal(classifyError(err).status, 500);
}

async function testIgnoresNonObjects() {
  assert.equal(isDbConnectionError(null), false);
  assert.equal(isDbConnectionError(undefined), false);
  assert.equal(isDbConnectionError('ECONNREFUSED'), false);
}

async function testClassifyMessageFallback() {
  assert.equal(classifyError(new Error('specific')).message, 'specific');
  assert.equal(classifyError('not an error').message, 'Internal server error');
}

const tests = [
  ['recognizes ECONNREFUSED', testRecognizesECONNREFUSED],
  ['recognizes pg connection sqlstate codes', testRecognizesPostgresSqlState],
  ['ignores unrelated pg codes', testIgnoresUnrelatedCodes],
  ['ignores error without code property', testIgnoresErrorWithoutCode],
  ['ignores non-object errors', testIgnoresNonObjects],
  ['classify message falls back when not an Error', testClassifyMessageFallback]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - errorMiddleware ${name}`);
}
