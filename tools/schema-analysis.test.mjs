import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { getColumnUsages, getSchemaHealthItems } from '../src/data/schemaAnalysis.js';
import { buildSchemaProduct } from '../src/data/schemaDictionary.js';

function table(id, names, outgoing = [], incoming = []) {
  const outgoingForeignKeys = outgoing.map(key => { const copy = { ...key }; delete copy.sourceTableKey; return copy; });
  const incomingForeignKeys = incoming.map(key => { const copy = { ...key }; delete copy.referencedTableKey; return copy; });
  return { id, columns: names.map(name => ({ name, dataType: 'int', purpose: '', source: {} })),
    indexes: [], keys: [{ type: 'PK' }], triggers: [], source: { outgoingForeignKeys, incomingForeignKeys } };
}
const fk = { name: 'FK_child_parent', sourceTableKey: 'dbo.child', referencedTableKey: 'dbo.parent',
  columns: [{ sourceColumnName: 'parent_id', referencedColumnName: 'id' }] };
const usages = tables => getColumnUsages({ tables }, 'id');

test('column usage matches only the column on the local side of each relationship', () => {
  const rows = usages([table('dbo.child', ['id', 'parent_id'], [fk]), table('dbo.parent', ['id', 'parent_id'], [], [fk])]);
  const count = (key, column) => rows.find(row => row.tableKey === key && row.columnName === column).foreignKeys.length;
  assert.equal(count('dbo.child', 'id'), 0);
  assert.equal(count('dbo.child', 'parent_id'), 1);
  assert.equal(count('dbo.parent', 'id'), 1);
  assert.equal(count('dbo.parent', 'parent_id'), 0);
});

test('composite foreign keys preserve direction and count each constraint once', () => {
  const composite = { ...fk, columns: [...fk.columns, { sourceColumnName: 'tenant_id', referencedColumnName: 'scope_id' }] };
  const rows = usages([table('dbo.parent', ['id', 'scope_id', 'tenant_id'], [], [composite])]);
  assert.equal(rows.find(row => row.columnName === 'scope_id').foreignKeys.length, 1);
  assert.equal(rows.find(row => row.columnName === 'tenant_id').foreignKeys.length, 0);
});

test('self-references are counted once per column and once in health risk counts', () => {
  const self = { ...fk, sourceTableKey: 'dbo.node', referencedTableKey: 'dbo.node', isDisabled: true };
  const node = table('dbo.node', ['id', 'parent_id', 'other_id'], [self], [structuredClone(self)]);
  const rows = usages([node]);
  assert.deepEqual(rows.map(row => row.foreignKeys.length), [1, 1, 0]);
  assert.equal(getSchemaHealthItems({ tables: [node] })[0].untrustedForeignKeyCount, 1);
});

test('same-named constraints from distinct source tables remain separate', () => {
  const other = { ...fk, sourceTableKey: 'other.child' };
  const rows = usages([table('dbo.parent', ['id'], [], [fk, other])]);
  assert.equal(rows[0].foreignKeys.length, 2);
});

for (const [product, versionName] of [['forms', '12.0.2607.40144'], ['lfds', '12.0.2607.421'], ['repository', '12.0.4.433'], ['workflow', '12.0.2605.385']]) {
test(`imported ${product} column usage agrees with actual constraint endpoint columns`, () => {
  const base = `data/${product}/${versionName}`;
  const version = buildSchemaProduct([{ schema: JSON.parse(fs.readFileSync(`${base}/schema.json`)), notes: JSON.parse(fs.readFileSync(`${base}/notes.json`)) }]).versions[0];
  for (const row of getColumnUsages(version, 'id')) {
    const owner = version.tables.find(item => item.id === row.tableKey);
    const expected = new Map([
      ...owner.source.outgoingForeignKeys.filter(key => key.columns.some(column => column.sourceColumnName === row.columnName))
        .map(key => [JSON.stringify([owner.id, key.name, key.referencedTableKey]), key.name]),
      ...owner.source.incomingForeignKeys.filter(key => key.columns.some(column => column.referencedColumnName === row.columnName))
        .map(key => [JSON.stringify([key.sourceTableKey, key.name, owner.id]), key.name]),
    ]);
    assert.deepEqual([...row.foreignKeys].sort(), [...expected.values()].sort());
  }
});
}
