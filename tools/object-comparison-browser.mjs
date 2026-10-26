import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.APP_URL ?? 'http://127.0.0.1:4177'}/?product=forms&view=compare&from=12.0.2509.20409&to=12.0.2607.40144`, { waitUntil: 'networkidle' });
  const section = page.locator('.object-comparison-section');
  await section.waitFor();
  assert.equal(await section.getByRole('button', { name: /^Structural changes/ }).getAttribute('aria-pressed'), 'true');
  assert.equal(await section.locator('[data-object-key="dbo.Split"]').count(), 0);
  await section.getByRole('button', { name: /^Definition-only changes/ }).click();
  const row = section.locator('[data-object-key="dbo.Split"]');
  await row.waitFor();
  assert.match(await row.innerText(), /Definition text changed/);
  assert.match(await row.innerText(), /Functional impact not established/);
  const before = row.locator('dd code').first();
  assert.equal(await before.isVisible(), false);
  await row.getByText('Technical details', { exact: true }).click();
  assert.equal(await before.textContent(), 'B87801758AB5835BBD477757AA1899164992F2A5A3CB4240DDA61C89BBF48558');
  await row.getByRole('button', { name: 'Copy before fingerprint for dbo.Split' }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await before.textContent());
  assert.equal(await section.getByRole('button', { name: /SQL diff/ }).count(), 0);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'outputs/compare-definition-details.png' });
  assert.deepEqual(errors, []);
  console.log('Compare browser checks passed: default, filters, hidden hashes, details, clipboard, and error-free rendering.');
} finally {
  await browser.close();
}
