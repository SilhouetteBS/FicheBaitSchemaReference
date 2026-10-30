// Explicit opt-in: sends ONE synthetic, privacy-checked staging error to the configured Sentry project.
// Never publishes a site, changes Sentry settings, or accesses the build token.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { preview, loadEnv } from 'vite';
import { chromium } from 'playwright';
import { getDiagnosticsConfig } from '../src/diagnostics/config.js';

assert.equal(process.env.SENTRY_LIVE_SMOKE, 'true', 'Set SENTRY_LIVE_SMOKE=true to explicitly allow a real staging event.');
const config = getDiagnosticsConfig({ ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env });
assert.ok(config && config.environment === 'staging', 'Requires enabled staging configuration.');
const html = await readFile('dist/index.html', 'utf8');
assert.ok(html.includes(config.origin), 'Build the matching Sentry-enabled artifact first.');
const marker = 'SYNTHETIC_PRIVATE_SEARCH_MUST_NOT_LEAVE_BROWSER';
let browser;
const server = await preview({ preview: { host: '127.0.0.1', port: 4191, strictPort: true } });
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage();
  const sent = [];
  await page.route(`${config.origin}/**`, async (route) => {
    try {
      const request = route.request();
      const body = request.postData();
      assert.ok(body, 'Expected an event envelope.');
      assert.doesNotMatch(body, new RegExp(marker));
      const headers = await request.allHeaders();
      assert.equal(headers.referer, undefined);
      assert.equal(headers.cookie, undefined);
      const lines = body.split('\n');
      assert.equal(JSON.parse(lines[1]).type, 'event');
      const event = JSON.parse(lines[2]);
      assert.equal(event.environment, 'staging');
      assert.equal(event.release, config.release);
      assert.equal(event.tags.operation, 'data.load');
      assert.equal(event.tags.resource, 'versions');
      assert.equal(event.tags.http_status, 503);
      for (const field of ['user','request','extra','contexts','message','transaction','server_name']) assert.equal(event[field], undefined);
      assert.ok(event.debug_meta?.images.length, 'Source-map debug IDs must be present.');
      assert.equal(sent.length, 0, 'Only one synthetic event is allowed.');
      sent.push(event);
      await route.continue();
    } catch (error) { await route.abort(); throw error; }
  });
  await page.route('**/data/forms/versions.json', (route) => route.fulfill({ status: 503, body: marker }));
  const responsePromise = page.waitForResponse((response) => response.url().startsWith(config.origin), { timeout: 30_000 });
  await page.goto(`http://127.0.0.1:4191/?q=${marker}`, { waitUntil: 'networkidle' });
  const response = await responsePromise;
  assert.equal(response.status(), 200, 'Sentry must accept the envelope.');
  await page.waitForTimeout(1000);
  assert.equal(sent.length, 1);
  console.log(JSON.stringify({ result: 'accepted', eventId: sent[0].event_id, release: config.release, environment: 'staging', eventsSent: sent.length, privacyAssertions: 'passed' }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
