import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';

const distDir = join(process.cwd(), 'dist');
const assetsDir = join(distDir, 'assets');
const appUrl = process.env.APP_URL;
const executablePath = process.env.CHROME_PATH || undefined;

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function gzipSize(path) {
  return gzipSync(readFileSync(path)).length;
}

assert.ok(existsSync(distDir), 'dist must exist; run npm run build before audit:performance');
assert.ok(existsSync(assetsDir), 'dist/assets must exist; run npm run build before audit:performance');

const assetFiles = listFiles(assetsDir);
const jsFiles = assetFiles.filter((file) => file.endsWith('.js'));
const cssFiles = assetFiles.filter((file) => file.endsWith('.css'));
const totalJsGzip = jsFiles.reduce((total, file) => total + gzipSize(file), 0);
const totalCssGzip = cssFiles.reduce((total, file) => total + gzipSize(file), 0);
const largestJsRaw = Math.max(...jsFiles.map((file) => statSync(file).size));

assert.ok(totalJsGzip <= 380_000, `JS gzip budget exceeded: ${totalJsGzip} bytes`);
assert.ok(totalCssGzip <= 90_000, `CSS gzip budget exceeded: ${totalCssGzip} bytes`);
assert.ok(largestJsRaw <= 500_000, `Largest JS asset budget exceeded: ${largestJsRaw} bytes`);

const schemaFiles = listFiles(join(distDir, 'data')).filter((file) => file.endsWith('schema.json'));
const largestSchema = Math.max(...schemaFiles.map((file) => statSync(file).size));
assert.ok(largestSchema <= 4_000_000, `Largest schema snapshot is unexpectedly large: ${largestSchema} bytes`);

const result = {
  cssGzipBytes: totalCssGzip,
  jsGzipBytes: totalJsGzip,
  largestJsRawBytes: largestJsRaw,
  largestSchemaBytes: largestSchema,
};

if (appUrl) {
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(appUrl, { waitUntil: 'networkidle' });
    const startupMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const schemaRequests = resources.filter((entry) => /\/schema\.json(?:\?|$)/.test(entry.name));
      const jsonRequests = resources.filter((entry) => /\.json(?:\?|$)/.test(entry.name));
      const firstContentfulPaint = performance
        .getEntriesByName('first-contentful-paint')
        .at(0)?.startTime ?? 0;
      return {
        firstContentfulPaint,
        jsonRequests: jsonRequests.length,
        schemaRequests: schemaRequests.length,
        transferredBytes: resources.reduce((total, entry) => total + (entry.transferSize || 0), 0),
      };
    });
    assert.ok(startupMetrics.schemaRequests <= 1, `Startup loaded too many schema snapshots: ${startupMetrics.schemaRequests}`);
    assert.ok(startupMetrics.jsonRequests <= 6, `Startup made too many JSON requests: ${startupMetrics.jsonRequests}`);
    assert.ok(startupMetrics.firstContentfulPaint <= 2500, `First contentful paint exceeded budget: ${startupMetrics.firstContentfulPaint}ms`);
    result.startup = startupMetrics;
    const tableMetrics = await page.locator('.table-list').evaluate((list) => ({
      renderedRows: list.querySelectorAll('.table-item').length,
      scrollHeight: list.scrollHeight,
    }));
    assert.ok(tableMetrics.renderedRows <= 260, `Rendered table list is too large: ${tableMetrics.renderedRows}`);

    const start = Date.now();
    await page.getByRole('button', { name: 'Diagram', exact: true }).click();
    await page.locator('.diagram-box').first().waitFor({ state: 'visible' });
    result.diagramRenderMs = Date.now() - start;
    assert.ok(result.diagramRenderMs <= 2500, `Diagram render exceeded budget: ${result.diagramRenderMs}ms`);
    result.renderedTableRows = tableMetrics.renderedRows;
  } finally {
    await browser.close();
  }
}

console.log(JSON.stringify({
  ...result,
  jsFiles: jsFiles.map((file) => relative(process.cwd(), file)),
  cssFiles: cssFiles.map((file) => relative(process.cwd(), file)),
}, null, 2));
