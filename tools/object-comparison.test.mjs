import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareVersions, filterComparisonObjectChanges, getObjectChangeCounts } from '../src/data/schemaDictionary.js';

const version = (routines = [], views = []) => ({ version: 'test', source: { tables: [], routines, views, triggers: [], dependencies: [] } });
const routine = (hash, extra = {}) => ({ key: 'dbo.Split', definitionSha256: hash, type: 'TF', ...extra });

test('definition fingerprints are informational and case insensitive', () => {
  const comparison = compareVersions(version([routine('ABC')]), version([routine('DEF')]));
  const change = comparison.objectChanges.routines.changed[0];
  assert.equal(change.changeCategory, 'definitionOnly');
  assert.equal(change.definitionChange.kind, 'textChanged');
  assert.deepEqual(change.structuralDetails, []);
  assert.match(change.details[0], /^definition:/);
  assert.deepEqual(getObjectChangeCounts(comparison), { all: 1, structural: 0, definitionOnly: 1 });
  assert.equal(compareVersions(version([routine('ABC')]), version([routine('abc')])).objectChanges.routines.changed.length, 0);
});

test('missing fingerprints indicate coverage rather than a proven SQL text change', () => {
  const comparison = compareVersions(version([routine('')]), version([routine('DEF')]));
  assert.equal(comparison.objectChanges.routines.changed[0].definitionChange.kind, 'metadataChanged');
});

test('mixed changes count once as structural and filters do not mutate comparisons', () => {
  const comparison = compareVersions(version([routine('ABC'), { key: 'dbo.Removed' }]), version([routine('DEF', { type: 'P' }), { key: 'dbo.Added' }]));
  const original = JSON.stringify(comparison);
  assert.deepEqual(getObjectChangeCounts(comparison), { all: 3, structural: 3, definitionOnly: 0 });
  assert.equal(filterComparisonObjectChanges(comparison, 'definitionOnly').objectChanges.routines.changed.length, 0);
  assert.equal(filterComparisonObjectChanges(comparison, 'structural').objectChanges.routines.changed.length, 1);
  assert.equal(JSON.stringify(comparison), original);
});

test('view output changes require exported columns on both sides', () => {
  const before = { key: 'dbo.View', columns: [{ ordinal: 1, name: 'id', typeDefinition: 'int', isNullable: false }] };
  const after = { ...before, columns: [{ ...before.columns[0], typeDefinition: 'bigint' }] };
  const comparison = compareVersions(version([], [before]), version([], [after]));
  assert.equal(comparison.objectChanges.views.changed[0].changeCategory, 'structural');
  assert.match(comparison.objectChanges.views.changed[0].structuralDetails[0], /^output columns:/);
  assert.equal(compareVersions(version([], [{ key: before.key }]), version([], [after])).objectChanges.views.changed.length, 0);
});

test('dependency changes stay in structural and all filters', () => {
  const comparison = { objectChanges: {}, dependencyChanges: { added: ['dbo.A -> dbo.B'], removed: [] } };
  assert.deepEqual(getObjectChangeCounts(comparison), { all: 1, structural: 1, definitionOnly: 0 });
  assert.equal(filterComparisonObjectChanges(comparison, 'definitionOnly').dependencyChanges.added.length, 0);
  assert.equal(filterComparisonObjectChanges(comparison, 'all').dependencyChanges.added.length, 1);
});
