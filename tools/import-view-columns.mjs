import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeSchema, parseExportJson } from './import-forms-metadata.mjs';
import { validateSchemaSnapshot } from '../src/data/schemaDictionary.js';

export function mergeViewColumns(snapshot, rows, productKey, productVersion) {
  assert.equal(snapshot.productKey, productKey, 'Product does not match target snapshot');
  assert.equal(snapshot.productVersion, productVersion, 'Version does not match target snapshot');
  assert.ok(Array.isArray(rows), 'View export must be an array');
  const byKey = new Map();
  for (const row of rows) {
    assert.ok(row && typeof row === 'object', 'Invalid view row');
    assert.equal(row.viewKey, `${row.schemaName}.${row.viewName}`, 'Inconsistent view identity');
    assert.ok(!byKey.has(row.viewKey), `Duplicate view: ${row.viewKey}`);
    assert.ok(Array.isArray(row.columns) && row.columns.length > 0, `Missing columns: ${row.viewKey}`);
    byKey.set(row.viewKey, row);
  }
  assert.deepEqual([...byKey.keys()].sort(), snapshot.views.map(view => view.key).sort(), 'Export must contain exactly the target snapshot views');
  for (const view of snapshot.views) {
    const row = byKey.get(view.key);
    assert.match(view.definitionSha256 ?? '', /^[a-f0-9]{64}$/i, `Missing existing definition hash: ${view.key}`);
    assert.equal(row.definitionSha256?.toUpperCase(), view.definitionSha256.toUpperCase(), `Definition changed: ${view.key}`);
  }
  const normalized = normalizeSchema({
    manifest: snapshot, views: rows,
    schemas: [], tables: [], columns: [], keys: [], foreignKeys: [], indexes: [], routines: [], triggers: [], dependencies: [],
  });
  const columnsByKey = new Map(normalized.views.map(view => [view.key, view.columns]));
  const result = { ...snapshot, views: snapshot.views.map(view => {
    const columns = columnsByKey.get(view.key);
    if (view.columns?.length) assert.deepEqual(columns, view.columns, `Refusing to replace existing column metadata: ${view.key}`);
    return { ...view, columns };
  }) };
  assert.deepEqual(validateSchemaSnapshot(result), [], 'Recovered snapshot failed validation');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const option = name => {
    const index = process.argv.indexOf(`--${name}`);
    const value = index >= 0 ? process.argv[index + 1] : '';
    assert.ok(value && !value.startsWith('--'), `Required: --${name}`);
    return value;
  };
  const product = option('product');
  const version = option('version');
  assert.match(product, /^[a-z][a-z0-9-]*$/);
  assert.match(version, /^\d+(?:\.\d+)*$/);
  const filename = path.resolve('data', product, version, 'schema.json');
  const snapshot = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const rows = parseExportJson(fs.readFileSync(option('input'), 'utf8'));
  const result = mergeViewColumns(snapshot, rows, product, version);
  fs.writeFileSync(filename, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ product, version, views: result.views.length, columns: result.views.reduce((sum, view) => sum + view.columns.length, 0) }));
}
