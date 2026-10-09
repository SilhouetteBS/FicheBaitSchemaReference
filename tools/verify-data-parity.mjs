import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    assert.ok(!entry.isSymbolicLink(), `Unexpected generated symlink: ${entry.name}`);
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });
}

export function verifyDataParity(sourceRoot = 'data', publicRoot = 'public/data') {
  const readJson = (name) => JSON.parse(fs.readFileSync(path.join(sourceRoot, name), 'utf8'));
  const products = readJson('products.json');
  const expected = new Set(['products.json']);
  let versionCount = 0;
  for (const product of products.products.filter((item) => item.status === 'available')) {
    assert.match(product.productKey, /^[a-z0-9-]+$/);
    const manifestName = `${product.productKey}/versions.json`;
    assert.equal(product.manifestUrl, `/data/${manifestName}`);
    expected.add(manifestName);
    const manifest = readJson(manifestName);
    assert.equal(manifest.productKey, product.productKey);
    assert.equal(new Set(manifest.versions.map((entry) => entry.version)).size, manifest.versions.length);
    assert.ok(manifest.versions.some((entry) => entry.version === manifest.defaultVersion));
    for (const entry of manifest.versions) {
      assert.match(entry.version, /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
      ++versionCount;
      for (const type of ['schema', 'notes']) {
        const name = `${product.productKey}/${entry.version}/${type}.json`;
        assert.equal(entry[`${type}Url`], `/data/${name}`);
        const data = readJson(name);
        assert.equal(data.productKey, product.productKey, `${name}: wrong product`);
        assert.equal(data.productVersion, entry.version, `${name}: wrong version`);
        expected.add(name);
      }
    }
  }
  const aiCatalog = readJson('ai/catalog.json');
  assert.equal(aiCatalog.products.reduce((count, product) => count + product.versions.length, 0), versionCount);
  for (const product of aiCatalog.products) {
    const manifest = readJson(`${product.productKey}/versions.json`);
    assert.deepEqual(product.versions.map((entry) => entry.version), manifest.versions.map((entry) => entry.version));
    for (const entry of product.versions) {
      const summary = readJson(`ai/${product.productKey}/${entry.version}/summary.json`);
      const schema = readJson(`${product.productKey}/${entry.version}/schema.json`);
      assert.equal(summary.counts.tables, schema.tables.length);
      assert.equal(summary.counts.columns, schema.tables.reduce((count, table) => count + table.columns.length, 0));
    }
  }
  for (const file of listFiles(path.join(sourceRoot, 'ai'))) expected.add(path.relative(sourceRoot, file).replaceAll(path.sep, '/'));
  for (const name of expected) {
    assert.deepEqual(fs.readFileSync(path.join(publicRoot, name)), fs.readFileSync(path.join(sourceRoot, name)), `Generated mirror differs: ${name}`);
  }
  const actual = new Set(listFiles(publicRoot).map((file) => path.relative(publicRoot, file).replaceAll(path.sep, '/')));
  assert.deepEqual(actual, expected, 'Unexpected or missing generated public files');
  return expected.size;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Verified ${verifyDataParity()} canonical/generated files, manifest identities, and AI counts.`);
}
