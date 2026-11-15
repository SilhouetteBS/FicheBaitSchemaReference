import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { globFiles } from '@sentry/bundler-plugins/core';

const sentryRequire = createRequire(import.meta.resolve('@sentry/bundler-plugins/core'));
const { glob } = sentryRequire('glob');

test('Sentry build glob stops directory traversal when cancellation happens during a read', async () => {
  const controller = new AbortController();
  const reason = new Error('cancelled build traversal');
  let reads = 0;
  const wrappedFs = {
    ...fs,
    readdir(...args) {
      reads += 1;
      const callback = args.pop();
      return fs.readdir(...args, (error, entries) => {
        if (reads === 1) controller.abort(reason);
        callback(error, entries);
      });
    },
  };
  await assert.rejects(glob('**/*', { cwd: 'reporting', fs: wrappedFs, signal: controller.signal }), error => error === reason);
  // Observe delayed reads as well as the initial rejection: old glob kept walking.
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(reads, 1, 'Cancellation must stop traversal, not just reject its promise');
});

test('Sentry build glob retains absolute file matching and ignore behavior', async () => {
  const ignored = 'forms-attachment-entry-usage.sql';
  const expected = fs.readdirSync('reporting/forms').filter(name => name.endsWith('.sql') && name !== ignored)
    .map(name => path.resolve('reporting/forms', name)).sort();
  assert.ok(expected.length > 0);
  const matches = await globFiles('reporting/forms/*.sql', { ignore: [`reporting/forms/${ignored}`] });
  assert.ok(matches.every(file => path.isAbsolute(file)), 'Raw results must remain absolute');
  assert.deepEqual(matches.map(file => path.resolve(file)).sort(), expected);
});

test('Sentry build glob accepts multiple patterns and an already-cancelled signal', async () => {
  const matches = await globFiles(['reporting/forms/*.sql', 'reporting/lfds/*.sql']);
  const expected = ['forms', 'lfds'].flatMap(product => fs.readdirSync(`reporting/${product}`)
    .filter(name => name.endsWith('.sql')).map(name => path.resolve('reporting', product, name))).sort();
  assert.deepEqual(matches.map(file => path.resolve(file)).sort(), expected);
  assert.equal(new Set(matches).size, matches.length);
  const reason = new Error('cancelled before traversal');
  await assert.rejects(glob('**/*', { cwd: 'reporting', signal: AbortSignal.abort(reason) }), error => error === reason);
});

test('Sentry asset discovery and source-map deletion patterns select only intended files', async () => {
  const root = 'tools/fixtures/build-glob/assets';
  const files = await globFiles(`${root}/**`, { ignore: [`${root}/ignored/**`] });
  assert.ok(files.every(file => path.isAbsolute(file) && fs.statSync(file).isFile()));
  assert.deepEqual(files.map(file => path.relative(root, file).split(path.sep).join('/')).sort(),
    ['main.js', 'main.js.map', 'nested/chunk.js', 'nested/chunk.js.map']);
  // Exercise the configured delete selector without deleting any fixture.
  const deletion = await globFiles(`${root}/**/*.map`);
  assert.deepEqual(deletion.map(file => path.relative(root, file).split(path.sep).join('/')).sort(),
    ['main.js.map', 'nested/chunk.js.map']);
});

test('patched minimatch bounds preprocessing expansion in the Sentry glob dependency', () => {
  const script = `import { createRequire } from 'node:module';
    const r = createRequire(import.meta.resolve('@sentry/bundler-plugins/core'));
    const { Minimatch } = createRequire(r.resolve('glob'))('minimatch');
    const result = new Minimatch('a/**/../'.repeat(12) + 'file.js', { optimizationLevel: 2, braceExpandMax: 64 });
    console.log(JSON.stringify({ entries: result.globParts.length }));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.error, undefined, 'Preprocessing must finish within the test budget');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).entries <= 64);
});
