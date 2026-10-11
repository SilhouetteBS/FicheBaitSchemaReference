import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.APP_URL ?? 'http://127.0.0.1:4177';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = new URL(base);
  url.search = new URLSearchParams({ product: 'lfds', version: '12.0.2607.421', view: 'diagram', diagramFocus: 'dbo.adgs_rules', diagramEdges: 'all', diagramMode: 'focused' });
  await page.goto(url.toString(), { waitUntil: 'networkidle' });
  const picker = page.getByRole('combobox', { name: 'Select database object' });
  const count = await page.locator('[data-node-key]').count();
  assert.ok(count > 1 && count < 15);
  await page.getByRole('button', { name: 'Select diagram object dbo.directory_objects', exact: true }).click();
  assert.equal(await picker.inputValue(), 'dbo.adgs_rules');
  await page.getByRole('button', { name: 'Expand connections dbo.directory_objects', exact: true }).click();
  await page.waitForFunction(n => globalThis.document.querySelectorAll('[data-node-key]').length > n, count);
  await page.getByRole('button', { name: 'Collapse connections dbo.directory_objects', exact: true }).click();
  await page.waitForFunction(n => globalThis.document.querySelectorAll('[data-node-key]').length === n, count);
  await page.getByRole('button', { name: 'Focus here dbo.directory_objects', exact: true }).click();
  assert.equal(await picker.inputValue(), 'dbo.directory_objects');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  assert.equal(await picker.inputValue(), 'dbo.adgs_rules');
  const schema = JSON.parse(fs.readFileSync('data/repository/12.0.4.433/schema.json', 'utf8'));
  const trigger = schema.triggers.find(t => t.parentObjectKey);
  url.search = new URLSearchParams({ product: 'repository', version: '12.0.4.433', view: 'diagram', diagramFocus: trigger.name, diagramEdges: 'all', diagramMode: 'focused' });
  await page.goto(url.toString(), { waitUntil: 'networkidle' });
  await page.locator(`[data-node-key="${trigger.parentObjectKey}"]`).waitFor();
  assert.ok(await page.locator('.diagram-edge-triggerParent').count() > 0);
  assert.deepEqual(errors, []);
  console.log('Object neighborhood browser regressions passed.');
} finally {
  await browser.close();
}
