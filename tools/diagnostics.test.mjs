import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDiagnosticsConfig } from '../src/diagnostics/config.js';
import { createEventGate, resourceCategory, sanitizeEvent } from '../src/diagnostics/policy.js';

const env = { VITE_SENTRY_ENABLED: 'true', VITE_SENTRY_DSN: 'https://0123456789abcdef0123456789abcdef@o123.ingest.us.sentry.io/456', VITE_SENTRY_RELEASE: 'schema-reference@abcdef123', VITE_SENTRY_ENVIRONMENT: 'staging' };
const config = getDiagnosticsConfig(env);
const origin = 'https://schema.example';
const frame = { filename: `${origin}/assets/main-123.js?q=FAKE_SECRET#PRIVATE`, lineno: 12, colno: 7, function: 'FAKE_SECRET', vars: { token: 'FAKE_SECRET' }, pre_context: ['FAKE_SECRET'] };

test('reporting requires explicit valid configuration and is disabled for editing builds', () => {
  assert.equal(getDiagnosticsConfig(), null);
  for (const change of [{ VITE_SENTRY_ENABLED: 'false' }, { VITE_ENABLE_EDITING: 'true' }, { VITE_SENTRY_RELEASE: '' }, { VITE_SENTRY_ENVIRONMENT: 'untrusted' }, { VITE_SENTRY_DSN: env.VITE_SENTRY_DSN.replace('sentry.io', 'evil.example') }]) assert.equal(getDiagnosticsConfig({ ...env, ...change }), null);
  assert.equal(config.origin, 'https://o123.ingest.us.sentry.io');
});

test('reconstructs only permitted fields, including nested exceptions, breadcrumbs and debugging metadata', () => {
  const event = { event_id: 'a'.repeat(32), timestamp: 123, message: 'FAKE_SECRET', user: { email: 'person@example.com', ip_address: '192.0.2.1' }, request: { url: `${origin}/?q=FAKE_SECRET`, headers: { Cookie: 'FAKE_SECRET' } }, contexts: { device: { name: 'PRIVATE_MACHINE' } }, extra: { sql: 'PRIVATE_QUERY' }, server_name: 'PRIVATE_MACHINE', transaction: 'FAKE_SECRET', tags: { operation: 'react.render', resource: 'schema', token: 'FAKE_SECRET' }, exception: { values: [{ type: 'TypeError', value: 'FAKE_SECRET', stacktrace: { frames: [frame, { filename: 'file:///C:/Users/PRIVATE/person.js' }, { filename: 'https://extension.example/assets/main.js' }] } }] }, debug_meta: { images: [{ code_file: frame.filename, debug_id: '12345678-1234-1234-1234-123456789abc', secret: 'FAKE_SECRET' }] } };
  const safe = sanitizeEvent(event, { config, origin, breadcrumbs: [{ message: 'console', data: { value: 'FAKE_SECRET' } }, { message: 'data.failed', data: { resource: 'schema', failure_kind: 'http', http_status: 404, url: 'FAKE_SECRET' } }] });
  assert.doesNotMatch(JSON.stringify(safe), /FAKE_SECRET|PRIVATE|person@|192\.0\.2|Cookie|sql|extension/);
  assert.equal(safe.exception.values[0].stacktrace.frames.length, 1);
  assert.equal(safe.exception.values[0].stacktrace.frames[0].filename, `${origin}/assets/main-123.js`);
  assert.equal(safe.breadcrumbs.length, 1);
  assert.equal(safe.debug_meta.images[0].code_file, `${origin}/assets/main-123.js`);
  assert.equal(safe.tags.operation, 'react.render');
});

test('unknown labels and paths never become telemetry', () => {
  const safe = sanitizeEvent({ tags: { operation: 'PRIVATE', resource: 'PRIVATE' }, exception: { values: [{ type: 'PRIVATE', value: 'PRIVATE' }] } }, { config, origin });
  assert.doesNotMatch(JSON.stringify(safe), /PRIVATE/);
  assert.equal(safe.tags.operation, 'browser.unexpected');
  assert.equal(resourceCategory('/data/forms/schema.json?q=PRIVATE'), 'schema');
  assert.equal(resourceCategory('PRIVATE'), 'other');
});

test('classifies browser module-load failures without transmitting original messages or URLs', () => {
  for (const message of [
    'Failed to fetch dynamically imported module: https://private.example/assets/PRIVATE.js?secret=PRIVATE',
    'error loading dynamically imported module: https://private.example/PRIVATE',
    'Importing a module script failed.',
    'Importing a module script failed',
  ]) {
    for (const operation of ['react.render', 'browser.unexpected']) {
      const safe = sanitizeEvent({ tags: { operation }, exception: { values: [{ type: 'TypeError', value: message }] } }, { config, origin });
      assert.equal(safe.tags.failure_kind, 'module_load');
      assert.equal(safe.tags.operation, operation);
      assert.equal(safe.exception.values[0].value, `Unexpected failure: ${operation}`);
      assert.doesNotMatch(JSON.stringify(safe), /PRIVATE|private\.example|dynamically imported|module script failed/);
      assert.equal(safe.exception.values[0].stacktrace, undefined);
    }
  }
});

test('does not classify ordinary fetch failures, render bugs or caller-supplied labels as module failures', () => {
  for (const [type, value, operation] of [
    ['TypeError', 'Failed to fetch', 'react.render'],
    ['TypeError', 'Cannot read properties of undefined', 'react.render'],
    ['Error', 'Failed to fetch dynamically imported module: PRIVATE', 'react.render'],
    ['TypeError', 'Failed to fetch dynamically imported module: PRIVATE', 'data.load'],
    ['TypeError', 'Importing a module script failed: unrelated PRIVATE', 'react.render'],
  ]) {
    const safe = sanitizeEvent({ tags: { operation, failure_kind: 'module_load' }, exception: { values: [{ type, value }] } }, { config, origin });
    assert.equal(safe.tags.failure_kind, undefined);
    assert.doesNotMatch(JSON.stringify(safe), /PRIVATE/);
  }
});

test('suppresses duplicate errors and rate limits distinct failures', () => {
  let time = 0;
  const gate = createEventGate(() => time);
  const event = (n) => ({ tags: { operation: 'react.render' }, exception: { values: [{ stacktrace: { frames: [{ lineno: n }] } }] } });
  const error = new Error();
  assert.equal(gate(event(0), error), true);
  assert.equal(gate(event(1), error), false);
  assert.equal(gate(event(0), new Error()), false);
  for (let n = 1; n < 10; n++) assert.equal(gate(event(n), new Error()), true);
  assert.equal(gate(event(11), new Error()), false);
  for (let window = 1; window <= 4; window++) {
    time += 60_000;
    for (let n = 0; n < 10; n++) assert.equal(gate(event(n), new Error()), true);
  }
  time += 60_000;
  assert.equal(gate(event(99), new Error()), false);
});
