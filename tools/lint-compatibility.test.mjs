import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';

test('accessibility lint retains label matching with its supported minimatch API', async () => {
  const eslint = new ESLint();
  const valid = await eslint.lintText('export function Sample() { return <label>Name<input /></label>; }', { filePath: 'src/lint-compatibility-fixture.jsx' });
  assert.deepEqual(valid[0].messages, []);
  const invalid = await eslint.lintText('export function Sample() { return <label><input /></label>; }', { filePath: 'src/lint-compatibility-fixture.jsx' });
  assert.ok(invalid[0].messages.some(message => message.ruleId === 'jsx-a11y/label-has-associated-control'));
});
