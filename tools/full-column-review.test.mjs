import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const versions = { forms: '12.0.2607.40144', lfds: '12.0.2607.421', repository: '12.0.4.433', workflow: '12.0.2605.385' };
const confidence = new Set(['confirmed', 'observed', 'inferred', 'unknown', 'deprecated', 'do_not_rely_on']);
for (const [product, version] of Object.entries(versions)) {
  const read = name => JSON.parse(fs.readFileSync(`data/${product}/${version}/${name}.json`, 'utf8'));
  const schema = read('schema');
  const notes = read('notes');
  test(`${product}: every exported table column has a purpose and valid confidence`, () => {
    assert.equal(notes.productVersion, version);
    for (const table of schema.tables) for (const column of table.columns) {
      const note = notes.tables[table.key]?.columns?.[column.name];
      assert.ok(note?.purpose?.trim(), `${table.key}.${column.name}`);
      assert.ok(confidence.has(note.confidence), `${table.key}.${column.name}`);
      if (!/^(date|datetime|datetime2|smalldatetime|datetimeoffset|time)$/.test(column.dataType)) {
        assert.doesNotMatch(note.purpose, /Timestamp or date value/i);
      }
    }
  });
  test(`${product}: enriched references match exported foreign keys and retain limitations`, () => {
    for (const table of schema.tables) for (const column of table.columns) {
      const note = notes.tables[table.key].columns[column.name];
      if (!note.purpose.includes('Exported foreign key ')) continue;
      const fk = schema.foreignKeys.find(f => f.sourceTableKey === table.key && f.columns.some(c => c.sourceColumnName === column.name) && note.purpose.includes(`Exported foreign key ${f.name}:`));
      assert.ok(fk, `${table.key}.${column.name}`);
      assert.ok(!fk.isDisabled && !fk.isNotTrusted);
      for (const pair of fk.columns) assert.ok(note.purpose.includes(`${pair.sourceColumnName} -> ${fk.referencedTableKey}.${pair.referencedColumnName}`));
      if (fk.columns.length > 1) assert.match(note.purpose, /Preserve all components of this composite reference/);
      assert.match(note.purpose, /not lifecycle or UI behavior/);
      assert.equal(note.confidence, 'inferred');
    }
  });
}
