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
  let releaseProducts;
  const productsGate = new Promise(resolve => { releaseProducts = resolve; });
  let productsHandled;
  const productsFinished = new Promise(resolve => { productsHandled = resolve; });
  await page.route('**/data/products.json', async route => { await productsGate; await route.continue(); productsHandled(); });
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  const loadingIcon = page.getByRole('img', { name: 'FicheBait Schema Reference', exact: true });
  await loadingIcon.waitFor();
  assert.match(await loadingIcon.getAttribute('src'), /schema-reference-favicon\.svg$/);
  await loadingIcon.evaluate(image => image.decode());
  assert.equal(await loadingIcon.evaluate(image => image.naturalWidth), 64);
  releaseProducts();
  await productsFinished;
  await page.unroute('**/data/products.json');
  const picker = page.getByRole('combobox', { name: 'Select database object' });
  await page.locator('[data-node-key="dbo.adgs_rules"]').waitFor();
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
  const focus = 'dbo.cf_bp_worker_instnc_to_resume';
  url.search = new URLSearchParams({ product: 'forms', version: '12.0.2607.40144', view: 'diagram', diagramFocus: focus, diagramEdges: 'all', diagramMode: 'focused', diagramZoom: '1' });
  await page.goto(url.toString(), { waitUntil: 'networkidle' });
  await page.locator(`[data-node-key="${focus}"]`).waitFor();
  const sameLane = await page.evaluate(() => {
    const nodes = new Map([...globalThis.document.querySelectorAll('[data-node-key]')].map(node => [node.dataset.nodeKey, { x: Number.parseFloat(node.style.left), width: Number.parseFloat(node.style.width) }]));
    return [...globalThis.document.querySelectorAll('.diagram-edge-hit-target')].flatMap(path => {
      const from = nodes.get(path.dataset.edgeFrom);
      const to = nodes.get(path.dataset.edgeTo);
      if (from.x !== to.x) return [];
      const numbers = path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      return [{ from: path.dataset.edgeFrom, to: path.dataset.edgeTo, x: from.x, width: from.width, startX: numbers[0], midX: numbers[2], endX: numbers.at(-2) }];
    });
  });
  assert.ok(sameLane.some(edge => edge.from === edge.to), 'Self-references remain rendered.');
  assert.ok(sameLane.some(edge => edge.from !== edge.to), 'Same-lane branches remain rendered.');
  for (const edge of sameLane) {
    assert.equal(edge.startX, edge.x, 'Outgoing same-lane connectors must use the inner left border.');
    assert.equal(edge.endX, edge.x, 'Arrowheads must enter the card, not point out of its right border.');
    assert.ok(edge.midX < edge.x && edge.midX >= 0);
  }
  fs.mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/forms-focused-routing.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Object neighborhood browser regressions passed.');
} finally {
  await browser.close();
}
