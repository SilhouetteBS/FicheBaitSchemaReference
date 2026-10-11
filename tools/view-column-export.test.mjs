import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeSchema } from './import-forms-metadata.mjs';
import { validateSchemaSnapshot } from '../src/data/schemaDictionary.js';

const fixture = columns => ({
  manifest: {productKey:'forms',productName:'Forms',productVersion:'fixture'},
  schemas:[],tables:[],columns:[],keys:[],foreignKeys:[],indexes:[],routines:[],triggers:[],dependencies:[],
  views:[{schemaName:'dbo',viewName:'v_sample',viewKey:'dbo.v_sample',...(columns === undefined ? {} : {columns})}],
});
test('view output metadata survives normalization with correct order and nullability', () => {
  const result = normalizeSchema(fixture([
    {columnName:'label',ordinal:2,dataType:'nvarchar',typeDefinition:'nvarchar(80)',maxLength:80,isNullable:true},
    {columnName:'id',ordinal:1,dataType:'int',typeDefinition:'int',isNullable:false},
  ]));
  assert.deepEqual(result.views[0].columns.map(c=>c.name), ['id','label']);
  assert.equal(result.views[0].columns[0].isNullable,false);
  assert.equal(result.views[0].columns[1].maxLength,80);
  assert.deepEqual(validateSchemaSnapshot(result),[]);
});
test('missing legacy view output metadata remains absent evidence, not guessed columns', () => {
  assert.deepEqual(normalizeSchema(fixture()).views[0].columns,[]);
});
test('malformed view columns fail snapshot validation', () => {
  const result = normalizeSchema(fixture([{columnName:'id',ordinal:1,dataType:'int'}]));
  result.views[0].columns.push({name:'id',ordinal:1});
  assert.ok(validateSchemaSnapshot(result).some(e=>e.includes('duplicate column name')));
  assert.ok(validateSchemaSnapshot(result).some(e=>e.includes('missing data type')));
  assert.ok(validateSchemaSnapshot(result).some(e=>e.includes('duplicate ordinal')));
});
test('standalone recovery and canonical view SELECT stay identical and metadata-only', () => {
  const canonical = fs.readFileSync('docs/sql-server-schema-export.sql','utf8');
  const recovery = fs.readFileSync('docs/view-columns-export.sql','utf8');
  const query = canonical.split('/* Result set 8: views */')[1].split('/* Result set 9:')[0].trim();
  assert.equal(recovery.slice(recovery.indexOf('SELECT\n')).trim(),query.replaceAll('\r\n','\n'));
  assert.match(query,/WHERE c.object_id = v.object_id/);
  assert.match(query,/JSON_QUERY/);
  assert.doesNotMatch(query,/\b(INSERT|UPDATE|DELETE|ALTER|DROP|EXEC)\b/i);
});
test('schema-only confidence is not labeled observed after reconciliation', () => {
  for (const [product,version,table,column] of [
    ['repository','12.0.4.433','dbo.toc','toc_uuid'],
    ['repository','12.0.4.433','dbo.toc','filing_date'],
    ['workflow','12.0.2605.385','dbo.task_error','error_id'],
    ['workflow','12.0.2605.385','dbo.wait_condition','condition_id'],
  ]) {
    const notes = JSON.parse(fs.readFileSync(`data/${product}/${version}/notes.json`,'utf8'));
    assert.equal(notes.tables[table].columns[column].confidence,'inferred');
  }
});
