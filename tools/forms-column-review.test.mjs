import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const notes = JSON.parse(fs.readFileSync('data/forms/12.0.2607.40144/notes.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('data/forms/12.0.2607.40144/schema.json', 'utf8'));
test('Forms operand and metrics reference descriptions preserve exported composite keys', () => {
  for (const [table, fk, names] of [
    ['dbo.formula_operands', 'FK_operand_trigger_field', ['trigger_form_id', 'trigger_field_id']],
    ['dbo.task_metrics_mapping', 'FK_task_metric_bp_step', ['process_id', 'step_id']],
  ]) {
    assert.deepEqual(schema.foreignKeys.find(f => f.name === fk).columns.map(c => c.sourceColumnName), names);
    for (const name of names) assert.match(notes.tables[table].columns[name].purpose, /composite reference/);
  }
  assert.match(notes.tables['dbo.formula_operands'].columns.formula_id.purpose, /dbo.formulae.id/);
  assert.match(notes.tables['dbo.task_metrics_mapping'].columns.instance_id.purpose, /not equivalent/);
});
test('Forms metric timing descriptions retain sample and substitution limitations', () => {
  const cols = notes.tables['dbo.task_metrics_mapping'].columns;
  assert.match(cols.creation_date.purpose, /Do not substitute history.start_date/);
  assert.match(cols.finish_date.purpose, /do not substitute the history timestamp/);
  assert.match(cols.due_date.purpose, /Historical synchronization.*unverified/);
});
test('Forms chart format and grouping codes are not documented as timestamps', () => {
  const key = 'dbo.cf_bp_chart_config';
  for (const name of ['category_date_format', 'group_by_date_format', 'series_date_format', 'group_by_date_group_by_method', 'category_date_group_by_method']) {
    assert.equal(schema.tables.find(t => t.key === key).columns.find(c => c.name === name).dataType, 'int');
    assert.match(notes.tables[key].columns[name].purpose, /not a stored date or timestamp/);
    assert.match(notes.tables[key].columns[name].purpose, /unverified/);
  }
});
test('Forms visualization and external-operation claims retain sample boundaries', () => {
  assert.match(notes.tables['dbo.report_subview'].columns.type.purpose, /sample mappings, not an exhaustive enum/);
  assert.match(notes.tables['dbo.report_subview'].columns.view_id.purpose, /not the object ID of a SQL Server view/);
  const operation = notes.tables['dbo.cf_bp_worker_instance_history'].columns.external_op;
  assert.equal(operation.confidence, 'inferred');
  assert.match(operation.purpose, /not a completed Invoke Workflow UI trace/);
  assert.match(notes.tables['dbo.cf_bp_chart_config'].columns.series_operation.purpose, /Other operations.*unverified/);
});
