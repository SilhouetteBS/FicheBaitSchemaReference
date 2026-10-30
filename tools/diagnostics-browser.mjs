import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';

const fakeDsn = 'https://0123456789abcdef0123456789abcdef@o123.ingest.us.sentry.io/456';
const marker = 'PRIVATE_PILOT_SEARCH_TOKEN';
const vite = join(process.cwd(), 'node_modules/vite/bin/vite.js');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const baseEnv = { ...process.env, SENTRY_UPLOAD_SOURCEMAPS: 'false', VITE_SENTRY_ENABLED: 'false', VITE_ENABLE_EDITING: 'false' };
function build(enabled) {
  const result = spawnSync(process.execPath, [vite, 'build'], {
    env: { ...baseEnv, VITE_SENTRY_ENABLED: String(enabled), VITE_SENTRY_DSN: fakeDsn,
      VITE_SENTRY_RELEASE: 'schema-reference@pilot-test123', VITE_SENTRY_ENVIRONMENT: 'staging' }, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const cleanup = spawnSync(process.execPath, ['tools/clean-source-maps.mjs'], { encoding: 'utf8' });
  assert.equal(cleanup.status, 0, cleanup.stderr);
}
async function inspectBuild(enabled) {
  const html = await readFile('dist/index.html', 'utf8');
  assert.equal(html.includes('connect-src \'self\' https://o123.ingest.us.sentry.io;'), enabled);
  for (const file of await readdir('dist/assets')) {
    assert.ok(!file.endsWith('.map'), 'No source maps in public output');
    if (file.endsWith('.js')) assert.doesNotMatch(await readFile(join('dist/assets', file), 'utf8'), /sourceMappingURL=/);
  }
}
async function scenario({ enabled, failure, blocked = false }) {
  const envelopes = [];
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('https://o123.ingest.us.sentry.io/**', async (route) => {
    const request = route.request();
    const body = request.postData();
    envelopes.push(body);
    assert.doesNotMatch(body, new RegExp(marker));
    const headers = await request.allHeaders();
    assert.equal(headers.referer, undefined);
    assert.equal(headers.cookie, undefined);
    if (blocked) await route.abort('failed');
    else await route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } });
  });
  if (failure === 'react') await page.route('**/assets/DatabaseDiagram-*.js', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({ response, body: body + `\nthrow new Error('${marker}');` });
  });
  if (failure === 'json') await page.route('**/data/forms/versions.json', (route) => route.fulfill({ status: 200, body: marker }));
  if (failure === 'data') await page.route('**/data/forms/versions.json', (route) => route.fulfill({ status: 503, body: marker }));
  await page.goto(`http://127.0.0.1:4189/?q=${marker}`, { waitUntil: 'networkidle' });
  if (failure === 'react') {
    await page.getByRole('button', { name: 'Diagram', exact: true }).click();
    await page.locator('.error-boundary').waitFor();
  } else if (['global', 'promise'].includes(failure)) {
    await page.route('**/assets/pilot-check.js', (route) => route.fulfill({ contentType: 'text/javascript', body: failure === 'promise' ? `Promise.reject(new TypeError('${marker}'));` : `setTimeout(() => { throw new TypeError('${marker}'); }, 0);` }));
    await page.evaluate(() => { const script = document.createElement('script'); script.src = '/assets/pilot-check.js'; document.head.append(script); });
  }
  if (enabled) {
    for (let attempt = 0; !envelopes.length && attempt < 100; attempt++) await page.waitForTimeout(100);
  }
  await page.waitForTimeout(700);
  assert.equal(envelopes.length, enabled ? 1 : 0, `${failure}: one report when enabled, none when disabled`);
  if (enabled) {
    const lines = envelopes[0].split('\n');
    const event = JSON.parse(lines[2]);
    assert.equal(event.release, 'schema-reference@pilot-test123');
    assert.equal(event.environment, 'staging');
    assert.equal(event.tags.operation, { react: 'react.render', data: 'data.load', json: 'data.load', global: 'browser.unexpected', promise: 'browser.unexpected' }[failure]);
    assert.equal(event.user, undefined); assert.equal(event.request, undefined); assert.equal(event.extra, undefined);
    if (failure === 'data') assert.equal(event.tags.http_status, 503);
    else if (failure === 'json') assert.equal(event.tags.failure_kind, 'json');
    else assert.ok(event.exception.values.some((value) => value.stacktrace?.frames.length), 'Readable asset locations retained');
    if (failure === 'react') assert.ok(event.debug_meta?.images.length, 'Debug IDs retained for source-map matching');
  }
  if (blocked) {
    await page.getByRole('button', { name: 'Tables', exact: true }).click();
    await page.locator('.table-list').waitFor();
  }
  await context.close();
  console.log(`PASS: ${enabled ? 'enabled' : 'disabled'} ${failure}${blocked ? ' with blocked delivery' : ''}`);
}
let server;
try {
  for (const enabled of [false, true]) {
    build(enabled);
    await inspectBuild(enabled);
    server = await preview({ preview: { host: '127.0.0.1', port: 4189, strictPort: true } });
    await scenario({ enabled, failure: 'global' });
    await scenario({ enabled, failure: 'promise' });
    await scenario({ enabled, failure: 'data' });
    await scenario({ enabled, failure: 'json' });
    await scenario({ enabled, failure: 'react', blocked: enabled });
    await new Promise((resolve) => server.httpServer.close(resolve)); server = null;
  }
} finally {
  if (server) await new Promise((resolve) => server.httpServer.close(resolve));
  await browser.close();
  // Leave the local dist artifact disabled, regardless of test outcome.
  build(false);
}
