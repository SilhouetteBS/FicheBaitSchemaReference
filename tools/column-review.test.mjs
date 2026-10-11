import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getColumnReviewRows, columnReviewToCsv } from '../src/data/columnReview.js';

const version = { tables: [
  { id: 'dbo.b', confidence: 'confirmed', columns: [{ name: 'id', dataType: 'int', confidence: 'unknown', purpose: 'Identifier' }] },
  { id: 'dbo.a', confidence: 'unknown', columns: [
    { name: 'title', dataType: 'nvarchar(50)', confidence: 'inferred', purpose: 'Form title' },
    { name: 'name', dataType: 'nvarchar(50)', purpose: 'Name, "display"\nvalue' },
  ] },
] };

test('column confidence is independent of table confidence and defaults to unknown', () => {
  assert.deepEqual(getColumnReviewRows(version).map(row => `${row.table}.${row.column}`), ['dbo.a.name', 'dbo.b.id']);
  assert.equal(getColumnReviewRows({ tables: [] }).length, 0);
});
test('status, table, and case-insensitive search combine without modifying schema', () => {
  const before = JSON.stringify(version);
  assert.equal(getColumnReviewRows(version, { status: 'inferred', query: ' FORM ' })[0].column, 'title');
  assert.equal(getColumnReviewRows(version, { status: '', tableKey: 'dbo.a' }).length, 2);
  assert.equal(getColumnReviewRows(version, { tableKey: 'dbo.a', query: 'int' }).length, 0);
  assert.equal(JSON.stringify(version), before);
});
test('CSV includes the complete filtered set and escapes punctuation', () => {
  const csv = columnReviewToCsv(getColumnReviewRows(version));
  assert.ok(csv.startsWith('table,column,type,confidence,purpose\n'));
  assert.ok(csv.includes('"Name, ""display""\nvalue"'));
  assert.ok(csv.includes('dbo.b,id,int,unknown,Identifier'));
});
