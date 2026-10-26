import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const launcher = fileURLToPath(new URL('./dev-editing.mjs', import.meta.url));

test('editing launcher starts Vite directly with Node and forwards arguments', () => {
  const result = spawnSync(process.execPath, [launcher, '--help'], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /vite|Usage/i);
  assert.match(result.stdout, /--host/);
});

test('editing launcher resolves Vite independently of a working directory containing spaces', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'schema editing launcher '));
  try {
    const result = spawnSync(process.execPath, [launcher, '--version'], { cwd, encoding: 'utf8', timeout: 15000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /vite\/\d+/);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
