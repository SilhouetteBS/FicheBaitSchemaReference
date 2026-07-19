import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const indexPath = join(distDir, 'index.html');

function assertFile(path, message) {
  assert.ok(existsSync(path), message);
  assert.ok(statSync(path).size > 0, `${message}: file is empty`);
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

assertFile(indexPath, 'dist/index.html must exist after npm run build');

const indexHtml = readFileSync(indexPath, 'utf8');
assert.match(indexHtml, /<div id="root"><\/div>/, 'index.html must contain the React root element');
assert.match(indexHtml, /Content-Security-Policy/i, 'index.html must include the static CSP meta tag');
assert.match(indexHtml, /FicheBait Schema Reference/i, 'index.html must include the app title');
assert.doesNotMatch(indexHtml, /frame-ancestors/i,
  'index.html must not claim meta-delivered frame-ancestors protection');

const faviconReference = indexHtml.match(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/i)?.[1];
assert.ok(faviconReference, 'index.html must reference a favicon');
const faviconPath = faviconReference.startsWith('/')
  ? join(distDir, faviconReference.split('/').filter(Boolean).at(-1))
  : join(distDir, faviconReference);
assertFile(faviconPath, 'Referenced favicon must exist in dist');

const referencedAssets = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((asset) => /\/assets\//.test(asset))
  .map((asset) => join(distDir, asset.replace(/^.*\/assets\//, 'assets/')));

assert.ok(referencedAssets.some((asset) => asset.endsWith('.js')), 'index.html must reference a JS bundle');
assert.ok(referencedAssets.some((asset) => asset.endsWith('.css')), 'index.html must reference a CSS bundle');
referencedAssets.forEach((asset) => assertFile(asset, `Referenced asset ${relative(process.cwd(), asset)} must exist`));

const files = await listFiles(distDir);
const publicDataFiles = files.filter((file) => relative(distDir, file).replaceAll('\\', '/').startsWith('data/'));
assert.ok(publicDataFiles.some((file) => file.endsWith('products.json')), 'dist/data/products.json must be emitted');
assert.ok(publicDataFiles.some((file) => file.endsWith('schema.json')), 'dist data must include schema snapshots');

console.log(JSON.stringify({
  assets: referencedAssets.length,
  dataFiles: publicDataFiles.length,
  indexBytes: statSync(indexPath).size,
}, null, 2));
