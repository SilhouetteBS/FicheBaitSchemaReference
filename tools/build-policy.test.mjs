import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { failSourceMapUpload } from '../vite.config.js';

test('source-map upload errors fail the release build rather than merely logging success', () => {
  const denied = new Error('403 Forbidden');
  assert.throws(() => failSourceMapUpload(denied), error => error === denied);
  assert.match(fs.readFileSync('vite.config.js', 'utf8'), /errorHandler:\s*upload\s*\?\s*failSourceMapUpload\s*:\s*undefined/);
});
