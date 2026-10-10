import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readStorage, writeStorage } from '../src/data/browserStorage.js';
import { getTableStability, getTableVersionTrend, getColumnLifecycleItems } from '../src/data/projectInsights.js';
import { getVersionTrendRows } from '../src/data/schemaCompleteness.js';
import { buildCatalogProduct, fetchJson, loadVersionEntry } from '../src/data/productLoader.js';
import { comparisonToCsv } from '../src/data/csvExports.js';
import { buildCorrectionIssueUrl } from '../src/data/correctionIssue.js';
import { objectNamesMatch } from '../src/data/objectNameMatching.js';
import { getReportingQuestions, getReportingPaths } from '../src/data/reporting.js';
import { parseExportJson, runImport } from './import-forms-metadata.mjs';
import { verifyDataParity } from './verify-data-parity.mjs';
import { validateDataReport } from './validate-data.mjs';
import { isTableNoteMap } from '../src/data/notes.js';
import { buildObjectAliasMap, resolveDependencyKey, classifyDependency, getDependencyResolutionItems } from '../src/data/schemaAnalysis.js';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const schema = readJson('data/forms/12.0.2607.40137/schema.json');
const manifest = readJson('data/forms/versions.json');
const triggerAliases = buildObjectAliasMap({ source: schema });
for (const dependency of schema.dependencies.filter((item) => item.referencingObjectTypeDescription === 'SQL_TRIGGER')) {
  assert.ok(resolveDependencyKey(dependency, 'referencing', triggerAliases), 'Qualified trigger references must resolve');
}
const ambiguous = buildObjectAliasMap({ source: { tables: [
  { key: 'a.shared', name: 'shared' }, { key: 'b.shared', name: 'shared' }, { key: 'c.shared', name: 'shared' },
] } });
assert.equal(resolveDependencyKey({ referencedEntityName: 'shared' }, 'referenced', ambiguous), '');
assert.equal(resolveDependencyKey({ referencedObjectKey: 'missing.shared', referencedEntityName: 'shared' }, 'referenced', ambiguous), '');
assert.equal(resolveDependencyKey({ referencedSchemaName: 'a', referencedEntityName: 'shared' }, 'referenced', ambiguous), 'a.shared');
assert.equal(classifyDependency({ referencingObjectTypeDescription: 'SQL_TRIGGER', referencedObjectKey: 'inserted' }).pseudoTable, true);
assert.equal(classifyDependency({ referencingObjectTypeDescription: 'SQL_TRIGGER', referencedObjectKey: 'dbo.inserted', referencedSchemaName: 'dbo' }).pseudoTable, false);
const incompleteWorkflow = readJson('data/workflow/12.0.2511.266/schema.json');
assert.equal(getDependencyResolutionItems({ source: incompleteWorkflow }).filter((item) =>
  item.referencingObjectTypeDescription === 'VIEW' && !item.referencingResolvedKey).length, 45);
const partial = buildCatalogProduct(manifest, [{ schema, notes: { tables: {} } }]);
const version = partial.versions.at(-1);
assert.equal(getTableStability(version, 'dbo.__TransactionHistory').pending, true);
assert.deepEqual(getColumnLifecycleItems(version, 'dbo.__TransactionHistory'), []);
assert.equal(getTableVersionTrend(version, 'dbo.__TransactionHistory')[0].present, null);
assert.equal(getVersionTrendRows(partial)[0].objectCount, 'Not loaded');
const complete = buildCatalogProduct(manifest, manifest.versions.map((entry) => ({
  schema: readJson(`data/forms/${entry.version}/schema.json`), notes: { tables: {} },
})));
assert.equal(getTableStability(complete.versions[0], 'dbo.__TransactionHistory').appearanceCount, 5);
assert.ok(getColumnLifecycleItems(complete.versions[0], 'dbo.__TransactionHistory').every((item) => item.stable));

const denied = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Full'); } };
assert.deepEqual(readStorage('x', [], undefined, denied), []);
assert.equal(writeStorage('x', [], denied), false);
for (const value of [null, {}, 12, 'text']) {
  assert.deepEqual(readStorage('x', [], undefined, { getItem: () => JSON.stringify(value) }), []);
}
assert.deepEqual(readStorage('x', {}, undefined, { getItem: () => '[]' }), {});
assert.deepEqual(readStorage('x', [], undefined, { getItem: () => '{broken' }), []);
assert.equal(isTableNoteMap({ 'dbo.bad': { warnings: 'not an array' } }), false);
assert.equal(isTableNoteMap({ 'dbo.valid': { summary: 'Purpose', warnings: ['Read only'] } }), true);

for (const view of ['tables', 'reporting', 'objects']) {
  const url = new URL(buildCorrectionIssueUrl({ productName: 'Forms', view, objectLabel: 'selected-context' }));
  assert.equal(url.searchParams.get('area').toLowerCase(), view);
  assert.equal(url.searchParams.get('schema_object'), 'selected-context');
}
const changes = { key: 'dbo.test', addedColumns: [], removedColumns: [], changedColumns: [],
  addedIndexes: [], removedIndexes: [], addedForeignKeys: [], removedForeignKeys: [],
  addedKeys: ['PK_new'], removedKeys: ['PK_old'], changedKeys: [{ name: 'PK_changed', details: ['columns changed'] }],
  changedIndexes: [{ name: 'IX_changed', details: ['filter changed'] }],
  changedForeignKeys: [{ name: 'FK_changed', details: ['target changed'] }],
};
const csv = comparisonToCsv({ addedTables: [], removedTables: [], changedTables: [changes] });
for (const category of ['added_key', 'removed_key', 'changed_key', 'changed_index', 'changed_foreign_key']) assert.ok(csv.includes(category));
assert.match(csv, /filter changed/);
const names = new Set(['dbo.users', 'audit.users', 'dbo.entries']);
assert.equal(objectNamesMatch('missing.users', names), false);
assert.equal(objectNamesMatch('users', names), false);
assert.equal(objectNamesMatch('[local database].[dbo].[entries]', names), true);
assert.equal(objectNamesMatch('entries', names), true);

for (const product of readJson('data/products.json').products) {
  for (const entry of readJson(`data/${product.productKey}/versions.json`).versions) {
    const item = readJson(`data/${product.productKey}/${entry.version}/schema.json`);
    const tables = new Set(item.tables.map((table) => table.key));
    for (const question of getReportingQuestions(product.productKey, tables)) assert.ok(question.tables.every((table) => tables.has(table)));
    for (const route of getReportingPaths(product.productKey)) assert.ok(route.tables.every((table) => tables.has(table)), `${product.productKey} ${entry.version}: ${route.title}`);
  }
}

assert.deepEqual(parseExportJson('\uFEFF[\n{"name":"example"}\n]'), [{ name: 'example' }]);
assert.deepEqual(parseExportJson('[{"name":"exam\nple"}]'), [{ name: 'example' }]);
assert.deepEqual(parseExportJson('JSON_F52\n"[{""name"":\n""example""}]"\n'), [{ name: 'example' }]);
assert.deepEqual(parseExportJson('"[{""name"":' + '"\n' + '"""example""}]"'), [{ name: 'example' }]);
assert.throws(() => parseExportJson('not json'), /Invalid JSON export/);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-review-'));
const fixture = readJson('tools/fixtures/minimal-export.json');
const files = { manifest: 'manifest', schemas: 'schemas', tables: 'tables', columns: 'columns', keys: 'primaryAndUniqueKeys',
  foreignKeys: 'foreignKeys', indexes: 'indexes', views: 'views', routines: 'routines', triggers: 'triggers', dependencies: 'dependencies' };
const oldArgv = process.argv;
try {
  for (const [key, name] of Object.entries(files)) fs.writeFileSync(path.join(temp, `Fixture_${name.toUpperCase()}.json`), `\uFEFF${JSON.stringify(fixture[key])}`);
  process.argv = [oldArgv[0], 'import', '--input-dir', temp, '--product', 'fixture', '--out', path.join(temp, 'out'),
    '--public-out', path.join(temp, 'mirror'), '--public-versions-out', path.join(temp, 'versions.json'), '--public-products-out', path.join(temp, 'products.json')];
  const imported = runImport();
  assert.equal(imported.tables.length, 2);
  fs.writeFileSync(path.join(temp, 'tables.json'), '[]');
  assert.throws(() => runImport(), /Ambiguous tables.json/);
  const canonical = path.join(temp, 'canonical');
  const mirror = path.join(temp, 'generated');
  fs.mkdirSync(path.join(canonical, 'ai'), { recursive: true });
  fs.writeFileSync(path.join(canonical, 'products.json'), JSON.stringify({ products: [] }));
  fs.writeFileSync(path.join(canonical, 'ai', 'catalog.json'), JSON.stringify({ products: [] }));
  fs.cpSync(canonical, mirror, { recursive: true });
  assert.equal(verifyDataParity(canonical, mirror), 2);
  fs.writeFileSync(path.join(mirror, 'stale.json'), '{}');
  assert.throws(() => verifyDataParity(canonical, mirror), /Unexpected or missing generated/);
  fs.unlinkSync(path.join(mirror, 'stale.json'));
  fs.writeFileSync(path.join(mirror, 'ai', 'catalog.json'), '{}');
  assert.throws(() => verifyDataParity(canonical, mirror), /Generated mirror differs/);
} finally {
  process.argv = oldArgv;
  // Only this explicitly created temporary directory is removed.
  assert.ok(path.resolve(temp).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
  fs.rmSync(temp, { recursive: true, force: true });
}

const originalFetch = globalThis.fetch;
try {
  let attempts = 0;
  globalThis.fetch = async () => { if (++attempts === 1) throw new Error('offline'); return { ok: true, json: async () => ({ value: 1 }) }; };
  await assert.rejects(fetchJson('/test/retry.json'), /Unable to request/);
  assert.deepEqual(await fetchJson('/test/retry.json'), { value: 1 });
  globalThis.fetch = async () => ({ ok: true, json: async () => schema });
  await assert.rejects(loadVersionEntry({ version: 'wrong', schemaUrl: '/test/version.json' }, 'forms'), /failed validation/);
  await assert.rejects(loadVersionEntry({ version: schema.productVersion, schemaUrl: '/test/product.json' }, 'lfds'), /failed validation/);
  globalThis.fetch = async (url) => ({ ok: true, json: async () => url.includes('notes') ? [] : schema });
  const invalidNotes = await loadVersionEntry({ version: schema.productVersion, schemaUrl: '/test/valid.json', notesUrl: '/test/notes.json' }, 'forms');
  assert.deepEqual(invalidNotes.notes, { tables: {} });
  assert.match(invalidNotes.warning, /could not be loaded/);
} finally { globalThis.fetch = originalFetch; }
const { summarizeMetadataWarnings } = await import('./metadata-warning-review.mjs');
assert.deepEqual(summarizeMetadataWarnings([
  'table "dbo.queue" has no exported primary key',
  'dependency 1 referencing object not exported: dbo.MissingView',
  'dependency 2 referenced object not exported: dbo.MissingType',
  'views export is empty; confirm the source database had no exported views',
  'triggers export is empty; confirm the source database had no exported triggers',
  'foreign key source table missing: dbo.NewMissingTable',
]), { primaryKeyObservation: 1, missingSourceEvidence: 1, missingTargetEvidence: 1,
  emptyExportConfirmation: 2, unclassified: 1 });
const warningReview = summarizeMetadataWarnings(validateDataReport().warnings);
for (const version of manifest.versions) {
  const versionSchema = readJson(`data${version.schemaUrl.slice('/data'.length)}`);
  const versionNotes = readJson(`data${version.notesUrl.slice('/data'.length)}`);
  const formulaFk = versionSchema.foreignKeys.find((fk) => fk.name === 'FK_field_formula');
  assert.equal(formulaFk.sourceTableKey, 'dbo.cf_fields');
  assert.equal(formulaFk.referencedTableKey, 'dbo.formulae');
  assert.ok(formulaFk.columns.some((column) => column.sourceColumnName === 'field_typed_formula_id' && column.referencedColumnName === 'id'));
  assert.equal(versionNotes.tables['dbo.cf_fields'].columns.field_typed_formula_id.confidence, 'observed');
  assert.equal(versionNotes.tables['dbo.cf_fields'].columns.signature_options.confidence, 'unknown');
  assert.equal(versionNotes.tables['dbo.cf_business_processes'].columns.faq_options.confidence, 'unknown');
}
assert.equal(warningReview.unclassified, 0, 'New warning classes require explicit review.');
assert.equal(Object.values(warningReview).reduce((sum, count) => sum + count, 0), validateDataReport().warnings.length);
console.log('Review regressions passed: history, storage, corrections, exports, matching, guidance, imports, load retries, and warning accounting.');
