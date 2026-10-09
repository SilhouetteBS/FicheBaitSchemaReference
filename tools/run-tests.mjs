import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getErrorBoundaryFallback } from '../src/components/errorBoundaryFallback.js';
import { buildCorrectionIssueUrl } from '../src/data/correctionIssue.js';
import {
  comparisonToCsv,
  relationshipsToCsv,
  reviewTablesToCsv,
  tableToCsv,
} from '../src/data/csvExports.js';
import { buildDatabaseDiagram } from '../src/data/diagram.js';
import { getEdgeGeometry } from '../src/data/diagramGeometry.js';
import { buildSchemaProduct, compareVersions, validateSchemaSnapshot } from '../src/data/schemaDictionary.js';
import { isLocalNoteDifferent, localNotesToVersionNotes } from '../src/data/notes.js';
import {
  assertGeneratedReportingExamplesSafe,
  buildGeneratedCandidateSql,
  buildGeneratedReportingExamples,
  buildTableReportingExamples,
  getReportingPaths,
  isCredentialOrConfigurationTable,
  isSensitiveColumnName,
  loadGeneratedCommunityReportingPatterns,
} from '../src/data/reporting.js';
import {
  getDependencyResolutionItems,
  getReviewItems,
  getSchemaHealthItems,
  getTableImpactItems,
  getUnresolvedDependencyItems,
} from '../src/data/schemaAnalysis.js';
import {
  formatCompletenessValue,
  getDatabaseRoleExplanation,
  getObjectCompletionByType,
  getSnapshotCompletenessRows,
  getTableCompletionBySchema,
  getVersionTrendRows,
} from '../src/data/schemaCompleteness.js';
import { buildUrlStatePath, readUrlState, writeUrlState } from '../src/data/urlState.js';
import { validateData, validateDataReport } from './validate-data.mjs';
import { validateAllNotes, validateNotesObject } from './validate-notes.mjs';
import { normalizeSchema, runImport } from './import-forms-metadata.mjs';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function makeTestTable(key, extraColumns = []) {
  const [schemaName, name] = key.split('.');
  return {
    key,
    schemaName,
    name,
    columns: [
      { name: 'id', dataType: 'int', typeDefinition: 'int', isNullable: false },
      ...extraColumns.map((name) => ({ name, dataType: 'int', typeDefinition: 'int', isNullable: true })),
    ],
    keys: [{ type: 'PK', columns: [{ columnName: 'id' }] }],
    indexes: [],
  };
}

function makeTestFk(name, sourceTableKey, referencedTableKey, columns = [['parent_id', 'id']]) {
  return {
    name,
    sourceTableKey,
    referencedTableKey,
    columns: columns.map(([sourceColumnName, referencedColumnName], index) => ({
      sourceColumnName,
      referencedColumnName,
      ordinal: index + 1,
    })),
  };
}

function makeDiagramVersion(tables, foreignKeys) {
  return {
    source: {
      tables,
      foreignKeys,
      views: [],
      routines: [],
      triggers: [],
      dependencies: [],
    },
  };
}

function makeRoutine(key) {
  const [schemaName, name] = key.split('.');
  return {
    key,
    schemaName,
    name,
    typeDescription: 'SQL_STORED_PROCEDURE',
  };
}

const forms11 = {
  schema: readJson('public/data/forms/11.0.2311.50564/schema.json'),
  notes: readJson('public/data/forms/11.0.2311.50564/notes.json'),
};
const forms12 = {
  schema: readJson('public/data/forms/12.0.2503.10378/schema.json'),
  notes: readJson('public/data/forms/12.0.2503.10378/notes.json'),
};
const forms12Later = {
  schema: readJson('public/data/forms/12.0.2509.20409/schema.json'),
  notes: readJson('public/data/forms/12.0.2509.20409/notes.json'),
};
const lfds12 = {
  schema: readJson('public/data/lfds/12.0.2506.370/schema.json'),
  notes: readJson('public/data/lfds/12.0.2506.370/notes.json'),
};
const minimalExport = readJson('tools/fixtures/minimal-export.json');
const product = buildSchemaProduct([forms11, forms12]);
const latestVersion = product.versions.at(-1);

const reviewNote = {
  confidence: 'confirmed',
  reviewStatus: 'approved',
  owner: 'Documentation owner',
  reviewer: 'Schema reviewer',
  lastReviewedAt: '2026-07-19',
  summary: 'Reviewed table purpose.',
  safeReportingNotes: ['Use for SELECT-only reporting.'],
  warnings: ['Validate against the selected version.'],
};
const exportedReviewNotes = localNotesToVersionNotes(
  { 'forms:12.0': { 'dbo.example': reviewNote } },
  'forms:12.0',
  'forms',
  '12.0',
);
assert.deepEqual(exportedReviewNotes.tables['dbo.example'], reviewNote, 'Notes export must preserve review metadata.');
assert.equal(isLocalNoteDifferent(exportedReviewNotes.tables['dbo.example'], reviewNote), false);
for (const [field, value] of [
  ['reviewStatus', 'in_review'],
  ['owner', 'Different owner'],
  ['reviewer', 'Different reviewer'],
  ['lastReviewedAt', '2026-07-18'],
]) {
  assert.equal(
    isLocalNoteDifferent({ ...reviewNote, [field]: value }, reviewNote),
    true,
    `${field} changes must mark a local note as different.`,
  );
}

assert.equal(product.id, 'forms');
assert.equal(product.name, 'Forms');
assert.equal(product.versions.length, 2);
const documentedRelationship = latestVersion.tables
  .flatMap((table) => table.relationships)
  .find((relationship) => relationship.columns?.length > 0);
assert.ok(documentedRelationship, 'Relationships must retain foreign-key column mappings.');
assert.equal(typeof documentedRelationship.deleteAction, 'string');
assert.equal(typeof documentedRelationship.updateAction, 'string');
assert.equal(typeof documentedRelationship.isDisabled, 'boolean');
assert.equal(typeof documentedRelationship.isNotTrusted, 'boolean');

const comparison = compareVersions(product.versions[0], latestVersion);
assert.ok(comparison.addedTables.length > 0);
assert.ok(comparison.changedTables.length > 0);
assert.match(comparisonToCsv(comparison), /^category,table,column_or_object,change/m);

const forms12ComparisonProduct = buildSchemaProduct([forms12, forms12Later]);
const forms12Comparison = compareVersions(...forms12ComparisonProduct.versions);
assert.ok(
  forms12Comparison.objectChanges.routines.changed.some((item) =>
    item.details.some((detail) => detail.startsWith('definition:')),
  ),
  'Routine definition hash changes must be reported.',
);
const attachmentDataChange = forms12Comparison.changedTables.find(
  (table) => table.key === 'dbo.cf_bp_attachment_data',
);
assert.ok(
  attachmentDataChange?.changedForeignKeys.some((foreignKey) =>
    foreignKey.name === 'FK_cf_bp_attachment_data_business_process'
      && foreignKey.details.includes('delete action: NO_ACTION -> SET_NULL'),
  ),
  'Foreign key action changes must be reported.',
);

const reportingPaths = getReportingPaths('forms');
assert.equal(reportingPaths.length, 4);

const examples = buildGeneratedReportingExamples(latestVersion);
assert.equal(examples.length, 4);
assert.ok(examples.some((example) => example.available));
assert.equal(examples.some((example) => /<process_|<status_/.test(example.sql)), false);
assert.equal(examples.some((example) => /\[password\]/i.test(example.sql)), false);
assert.equal(isSensitiveColumnName('password'), true);
assert.equal(isSensitiveColumnName('refresh_token'), true);
assert.equal(isSensitiveColumnName('tokenHash'), true);
assert.equal(isSensitiveColumnName('authentication_key'), true);
assert.equal(isSensitiveColumnName('authenticationKey'), true);
assert.equal(isSensitiveColumnName('connectionString'), true);
assert.equal(isSensitiveColumnName('display_name'), false);
assert.equal(isCredentialOrConfigurationTable({ key: 'dbo.service_configuration' }), true);
assert.equal(isCredentialOrConfigurationTable({ key: 'dbo.configValues' }), true);
assert.equal(isCredentialOrConfigurationTable({ key: 'dbo.cf_users' }), false);
assert.deepEqual(buildTableReportingExamples(latestVersion, 'dbo.cf_users').some((example) => /\[password\]/i.test(example.sql)), false);
assert.deepEqual(buildTableReportingExamples(latestVersion, 'dbo.cf_lookup_tokens'), []);
assert.throws(
  () =>
    assertGeneratedReportingExamplesSafe(latestVersion, [
      {
        title: 'Unsafe users example',
        tables: ['dbo.cf_users'],
        sql: 'SELECT [password] FROM [dbo].[cf_users];',
      },
    ]),
  /Sensitive columns found.*dbo\.cf_users\.password/,
);
const inertCandidateSql = buildGeneratedCandidateSql({
  title: 'Unsafe source excerpt',
  product: 'forms',
  tables: ['dbo.cf_users'],
  confirmedVersions: ['12.0'],
  answersLinks: [{ title: 'Source', url: 'https://answers.laserfiche.com/questions/1/example' }],
  capturedExcerpt: 'DELETE FROM dbo.cf_users;\nGO\nEXEC dbo.some_procedure;',
});
assert.match(inertCandidateSql, /Source: https:\/\/answers\.laserfiche\.com\/questions\/1\/example/);
assert.match(inertCandidateSql, /-- DELETE FROM dbo\.cf_users;\n-- GO\n-- EXEC dbo\.some_procedure;/);
const generatedRepositoryPatterns = await loadGeneratedCommunityReportingPatterns('repository');
assert.ok(generatedRepositoryPatterns.length > 0);
assert.ok(generatedRepositoryPatterns.every((pattern) => pattern.tags.includes('Unreviewed source excerpt')));
assert.ok(generatedRepositoryPatterns.every((pattern) => !pattern.tags.includes('Read-only')));

const impactItems = getTableImpactItems(latestVersion);
assert.ok(impactItems.length > 0);
assert.ok(impactItems[0].score >= impactItems.at(-1).score);

const healthItems = getSchemaHealthItems(latestVersion);
assert.ok(healthItems.length > 0);
assert.ok(healthItems.some((item) => item.riskFlags.length > 0));

const reviewItems = getReviewItems(latestVersion);
assert.ok(reviewItems.length > 0);
assert.ok(reviewItems[0].columnsNeedingReview >= reviewItems.at(-1).columnsNeedingReview);

assert.equal(formatCompletenessValue(''), 'Not exported');
assert.match(getDatabaseRoleExplanation('forms'), /Laserfiche Forms/i);
assert.ok(getSnapshotCompletenessRows(latestVersion).some((row) => row.label === 'Dependencies' && row.value !== '0'));
assert.ok(getTableCompletionBySchema(latestVersion).some((row) => row.label === 'dbo' && /^\d+\/\d+$/.test(row.value)));
assert.deepEqual(
  getObjectCompletionByType(latestVersion).map((row) => row.label),
  ['Tables', 'Views', 'Routines', 'Triggers'],
);
assert.equal(getVersionTrendRows(product).length, product.versions.length);
assert.match(getVersionTrendRows(product).at(-1).dependencyResolution, /^\d+\/\d+$/);
assert.match(tableToCsv(latestVersion.tables[0]), /^column,type,nullable,confidence,purpose/m);
assert.match(relationshipsToCsv(latestVersion.tables[0], latestVersion.tables[0].relationships), /^table,direction,related_table,confidence,note/m);
assert.match(reviewTablesToCsv(latestVersion.tables.slice(0, 1)), /^table,confidence,has_manual_notes,columns,summary/m);
assert.match(reviewTablesToCsv([{ ...latestVersion.tables[0], summary: 'Comma, quote " test', columns: [] }]), /"Comma, quote "" test"/);

const focusedDiagramWithoutFocus = buildDatabaseDiagram(latestVersion, '', 'all', '', 'focused', 1);
assert.equal(focusedDiagramWithoutFocus.edges.length, 0);
const focusedDiagram = buildDatabaseDiagram(latestVersion, '', 'all', 'dbo.cf_business_processes', 'focused', 1);
assert.ok(focusedDiagram.edges.length > 0);
assert.ok(focusedDiagram.nodes.length < focusedDiagramWithoutFocus.nodes.length);
const twoHopDiagram = buildDatabaseDiagram(latestVersion, '', 'all', 'dbo.cf_business_processes', 'focused', 2);
assert.ok(twoHopDiagram.nodes.length >= focusedDiagram.nodes.length);
assert.ok(twoHopDiagram.edges.some((edge) => edge.from !== 'dbo.cf_business_processes' && edge.to !== 'dbo.cf_business_processes'));
const secondHopEdge = twoHopDiagram.edges.find(
  (edge) => edge.from !== 'dbo.cf_business_processes' && edge.to !== 'dbo.cf_business_processes',
);
const secondHopGeometry = getEdgeGeometry(secondHopEdge, twoHopDiagram, {
  mode: 'focused',
  focusKey: 'dbo.cf_business_processes',
});
assert.notEqual(secondHopGeometry.startX, twoHopDiagram.positionedByKey.get('dbo.cf_business_processes').x + 250);
const fullDiagram = buildDatabaseDiagram(latestVersion, '', 'all', 'dbo.cf_business_processes', 'full', 1);
assert.ok(fullDiagram.edges.length > twoHopDiagram.edges.length);
const lfdsProduct = buildSchemaProduct([lfds12]);
const lfdsVersion = lfdsProduct.versions[0];
const connectorRegressionDiagram = buildDatabaseDiagram(
  lfdsVersion,
  'attribute_def_acls_audit',
  'foreignKey',
  'dbo.attribute_def_acls_audit',
  'focused',
  1,
);
assert.equal(connectorRegressionDiagram.nodes.length, 2);
assert.equal(connectorRegressionDiagram.edges.length, 1);
const connectorRegressionEdge = connectorRegressionDiagram.edges[0];
const connectorRegressionGeometry = getEdgeGeometry(connectorRegressionEdge, connectorRegressionDiagram, {
  mode: 'focused',
  focusKey: 'dbo.attribute_def_acls_audit',
});
const focusedRegressionNode = connectorRegressionDiagram.positionedByKey.get('dbo.attribute_def_acls_audit');
const relatedRegressionNode = connectorRegressionDiagram.positionedByKey.get('dbo.audit_events');
assert.equal(connectorRegressionGeometry.startX, focusedRegressionNode.x + focusedRegressionNode.width);
assert.equal(connectorRegressionGeometry.endX, relatedRegressionNode.x);
assert.ok(connectorRegressionGeometry.midX > connectorRegressionGeometry.startX);
assert.ok(connectorRegressionGeometry.midX < connectorRegressionGeometry.endX);
const adgsRulesOneHopDiagram = buildDatabaseDiagram(
  lfdsVersion,
  'adgs_rules',
  'foreignKey',
  'dbo.adgs_rules',
  'focused',
  1,
);
assert.equal(adgsRulesOneHopDiagram.nodes.length, 3);
assert.equal(adgsRulesOneHopDiagram.edges.length, 2);
assert.deepEqual(
  adgsRulesOneHopDiagram.edges.map((edge) => edge.label).sort(),
  ['adgs_rules_directory_objects_fk', 'adgs_rules_identity_providers_fk'],
);
const adgsRulesTwoHopDiagram = buildDatabaseDiagram(
  lfdsVersion,
  'adgs_rules',
  'foreignKey',
  'dbo.adgs_rules',
  'focused',
  2,
);
assert.equal(adgsRulesTwoHopDiagram.edges.filter((edge) => edge.hop === 1).length, 2);
assert.ok(adgsRulesTwoHopDiagram.edges.filter((edge) => edge.hop === 2).length > 0);
assert.equal(adgsRulesTwoHopDiagram.edges.some((edge) => edge.label === 'directory_objects_directory_objects_fk'), false);

const syntheticVersion = makeDiagramVersion(
  [
    makeTestTable('dbo.focus', ['parent_id', 'alt_parent_id', 'shared_id', 'tenant_id']),
    makeTestTable('dbo.parent', ['shared_id', 'tenant_id']),
    makeTestTable('dbo.alt_parent', ['shared_id']),
    makeTestTable('dbo.shared'),
  ],
  [
    makeTestFk('focus_parent_fk', 'dbo.focus', 'dbo.parent'),
    makeTestFk('focus_parent_alt_fk', 'dbo.focus', 'dbo.parent', [['alt_parent_id', 'id']]),
    makeTestFk('focus_alt_parent_composite_fk', 'dbo.focus', 'dbo.alt_parent', [
      ['shared_id', 'shared_id'],
      ['tenant_id', 'id'],
    ]),
    makeTestFk('parent_shared_fk', 'dbo.parent', 'dbo.shared', [['shared_id', 'id']]),
    makeTestFk('alt_parent_shared_fk', 'dbo.alt_parent', 'dbo.shared', [['shared_id', 'id']]),
    makeTestFk('parent_self_fk', 'dbo.parent', 'dbo.parent'),
  ],
);
const syntheticOneHop = buildDatabaseDiagram(syntheticVersion, '', 'foreignKey', 'dbo.focus', 'focused', 1);
assert.equal(syntheticOneHop.edges.length, 3);
assert.equal(syntheticOneHop.edges.some((edge) => edge.label === 'parent_self_fk'), false);
assert.equal(syntheticOneHop.edges.filter((edge) => edge.to === 'dbo.parent').length, 2);
assert.ok(
  syntheticOneHop.edges
    .find((edge) => edge.label === 'focus_alt_parent_composite_fk')
    .columnSummary.includes('shared_id -> shared_id'),
);
const syntheticTwoHop = buildDatabaseDiagram(syntheticVersion, '', 'foreignKey', 'dbo.focus', 'focused', 2);
assert.equal(syntheticTwoHop.edges.some((edge) => edge.label === 'parent_self_fk'), false);
assert.equal(syntheticTwoHop.edges.filter((edge) => edge.label.endsWith('_shared_fk')).length, 2);
const dependencyTypeFiltered = buildDatabaseDiagram(
  latestVersion,
  '',
  'all',
  '',
  'full',
  1,
  { table: true, view: true, routine: false, trigger: false },
);
assert.equal(dependencyTypeFiltered.nodes.some((node) => node.type === 'routine'), false);
assert.equal(dependencyTypeFiltered.nodes.some((node) => node.type === 'trigger'), false);
assert.ok(dependencyTypeFiltered.nodes.some((node) => node.type === 'view'));
const fullDiagramWithIsolated = buildDatabaseDiagram(latestVersion, '', 'all', '', 'full', 1);
const fullDiagramConnectedOnly = buildDatabaseDiagram(
  latestVersion,
  '',
  'all',
  '',
  'full',
  1,
  { table: true, view: true, routine: true, trigger: true },
  { connectedOnly: true },
);
assert.ok(fullDiagramConnectedOnly.nodes.length < fullDiagramWithIsolated.nodes.length);
assert.equal(
  fullDiagramConnectedOnly.nodes.every((node) =>
    fullDiagramConnectedOnly.edges.some((edge) => edge.from === node.key || edge.to === node.key),
  ),
  true,
);

const lfdsDependencyDiagram = buildDatabaseDiagram(
  lfdsVersion,
  'adgs_rules',
  'dependency',
  'dbo.adgs_rules',
  'focused',
  1,
);
assert.equal(lfdsDependencyDiagram.edges.length, 1);
assert.deepEqual(
  new Set(lfdsDependencyDiagram.nodes.map((node) => node.type)),
  new Set(['table', 'routine']),
);
assert.equal(lfdsDependencyDiagram.relationshipDetails[0].direction, 'depended on by');

const lfdsMixedDiagram = buildDatabaseDiagram(
  lfdsVersion,
  'adgs_rules',
  'all',
  'dbo.adgs_rules',
  'focused',
  1,
);
assert.equal(lfdsMixedDiagram.edges.filter((edge) => edge.type === 'foreignKey').length, 2);
assert.equal(lfdsMixedDiagram.edges.filter((edge) => edge.type === 'dependency').length, 1);
assert.ok(getDependencyResolutionItems(lfdsVersion).length > 0);
assert.ok(getUnresolvedDependencyItems(lfdsVersion).length > 0);
assert.ok(getUnresolvedDependencyItems(lfdsVersion).some((item) => item.status.includes('not exported')));

const ambiguousDependencyVersion = {
  source: {
    tables: [
      makeTestTable('dbo.shared'),
      makeTestTable('archive.shared'),
    ],
    foreignKeys: [],
    views: [],
    routines: [makeRoutine('dbo.use_shared')],
    triggers: [],
    dependencies: [
      {
        referencingObjectKey: 'dbo.use_shared',
        referencingSchemaName: 'dbo',
        referencingEntityName: 'use_shared',
        referencedObjectKey: 'shared',
        referencedEntityName: 'shared',
        referencedObjectTypeDescription: 'USER_TABLE',
      },
    ],
  },
};
const ambiguousDependencyDiagram = buildDatabaseDiagram(
  ambiguousDependencyVersion,
  '',
  'dependency',
  '',
  'full',
  1,
);
assert.equal(ambiguousDependencyDiagram.edges.length, 0);

const urlState = readUrlState('?product=forms&version=12&view=health&table=dbo.cf_users');
assert.equal(urlState.product, 'forms');
assert.equal(urlState.view, 'health');
assert.equal(readUrlState('?diagramTypes=table%2Cview').diagramTypes, 'table,view');
assert.equal(readUrlState('?diagramSecondHop=hidden&diagramConnectedOnly=true').diagramSecondHop, 'hidden');
assert.equal(readUrlState('?diagramSecondHop=hidden&diagramConnectedOnly=true').diagramConnectedOnly, 'true');
assert.equal(
  buildUrlStatePath(
    {
      product: 'forms',
      version: '12',
      view: 'diagram',
      table: '',
      diagramMode: 'focused',
      diagramEdges: 'foreignKey',
      diagramDepth: '2',
      diagramZoom: '1.25',
      diagramTypes: 'table,view',
      diagramSecondHop: 'hidden',
      diagramConnectedOnly: 'true',
    },
    '?keep=1',
    '/app',
    '#top',
  ),
  '/app?keep=1&product=forms&version=12&view=diagram&diagramMode=focused&diagramEdges=foreignKey&diagramDepth=2&diagramZoom=1.25&diagramTypes=table%2Cview&diagramSecondHop=hidden&diagramConnectedOnly=true#top',
);
const historyCalls = [];
const fakeHistory = {
  pushState: (...args) => historyCalls.push(['push', ...args]),
  replaceState: (...args) => historyCalls.push(['replace', ...args]),
};
writeUrlState(
  { product: 'forms', version: '12', view: 'tables' },
  { currentSearch: '', pathname: '/app/', hash: '', history: fakeHistory, mode: 'push' },
);
writeUrlState(
  { product: 'forms', version: '12', view: 'tables', q: 'users' },
  { currentSearch: '', pathname: '/app/', hash: '', history: fakeHistory },
);
assert.deepEqual(historyCalls.map(([method]) => method), ['push', 'replace']);

const correctionIssueUrl = new URL(buildCorrectionIssueUrl({
  productName: 'Forms',
  version: '12',
  view: 'Tables',
  objectLabel: 'dbo.cf_users',
  currentUrl: 'https://example.test/?table=dbo.cf_users',
}));
assert.equal(correctionIssueUrl.searchParams.get('template'), 'documentation-correction.yml');
assert.equal(correctionIssueUrl.searchParams.get('schema_object'), 'dbo.cf_users');

const notes = localNotesToVersionNotes(
  {
    'forms:12.0.2503.10378': {
      'dbo.example': {
        confidence: 'observed',
        summary: 'Example table',
        safeReportingNotes: ['Read only'],
        warnings: ['Do not write'],
      },
    },
  },
  'forms:12.0.2503.10378',
  'forms',
  '12.0.2503.10378',
);
assert.equal(notes.productKey, 'forms');
assert.equal(notes.tables['dbo.example'].confidence, 'observed');

const normalizedFixture = normalizeSchema(minimalExport);
const sysdiagramsFixture = structuredClone(minimalExport);
sysdiagramsFixture.tables.push({ tableKey: 'dbo.sysdiagrams', schemaName: 'dbo', tableName: 'sysdiagrams' });
sysdiagramsFixture.columns.push({
  tableKey: 'dbo.sysdiagrams',
  columnName: 'diagram_id',
  ordinal: 1,
  dataType: 'int',
  typeDefinition: 'int',
  isNullable: false,
  isIdentity: true,
  isComputed: false,
});
sysdiagramsFixture.keys.push({
  tableKey: 'dbo.sysdiagrams',
  constraintName: 'PK__sysdiagrams',
  constraintType: 'PK',
  constraintTypeDescription: 'PRIMARY_KEY_CONSTRAINT',
  backingIndexName: 'PK__sysdiagrams',
  columns: [{ columnName: 'diagram_id', keyOrdinal: 1 }],
});
sysdiagramsFixture.foreignKeys.push({
  foreignKeyName: 'FK_child_sysdiagrams',
  sourceTableKey: 'dbo.child',
  referencedTableKey: 'dbo.sysdiagrams',
  deleteAction: 'NO_ACTION',
  updateAction: 'NO_ACTION',
  isDisabled: false,
  isNotTrusted: false,
  columns: [{ sourceColumnName: 'parent_id', referencedColumnName: 'diagram_id' }],
});
sysdiagramsFixture.indexes.push({
  tableKey: 'dbo.sysdiagrams',
  indexName: 'IX_sysdiagrams',
  indexTypeDescription: 'NONCLUSTERED',
  isUnique: false,
  isPrimaryKey: false,
  isUniqueConstraint: false,
  hasFilter: false,
  columns: [{ columnName: 'diagram_id', keyOrdinal: 1 }],
});
sysdiagramsFixture.triggers.push({
  triggerName: 'tr_sysdiagrams',
  parentObjectKey: 'dbo.sysdiagrams',
  parentObjectTypeDescription: 'USER_TABLE',
  isDisabled: false,
  isInsteadOfTrigger: false,
  definitionSha256: 'sys',
});
sysdiagramsFixture.dependencies.push({
  referencingObjectKey: 'dbo.v_child',
  referencingObjectTypeDescription: 'VIEW',
  referencedObjectKey: 'dbo.sysdiagrams',
  referencedSchemaName: 'dbo',
  referencedEntityName: 'sysdiagrams',
  referencedObjectTypeDescription: 'USER_TABLE',
  isSchemaBoundReference: false,
  isCallerDependent: false,
  isAmbiguous: false,
});
const normalizedSysdiagramsFixture = normalizeSchema(sysdiagramsFixture);

assert.equal(normalizedFixture.tables.length, 2);
assert.equal(normalizedSysdiagramsFixture.tables.length, 2);
assert.equal(normalizedSysdiagramsFixture.foreignKeys.length, 1);
assert.equal(normalizedSysdiagramsFixture.triggers.length, 1);
assert.equal(normalizedSysdiagramsFixture.dependencies.length, 1);
assert.equal(
  JSON.stringify(normalizedSysdiagramsFixture).includes('sysdiagrams'),
  false,
);
assert.equal(normalizedFixture.foreignKeys[0].name, 'FK_child_parent');
assert.equal(normalizedFixture.tables.find((table) => table.key === 'dbo.child').incomingForeignKeys.length, 0);
assert.equal(normalizedFixture.tables.find((table) => table.key === 'dbo.child').outgoingForeignKeys.length, 1);
assert.equal(normalizedFixture.tables.find((table) => table.key === 'dbo.child').indexes.length, 1);
assert.equal(normalizedFixture.tables.find((table) => table.key === 'dbo.child').triggers.length, 1);
assert.equal(normalizedFixture.views[0].dependencies.length, 1);
assert.deepEqual(validateSchemaSnapshot(normalizedFixture), []);
assert.ok(validateSchemaSnapshot({ productKey: 'bad' }).length > 0);
assert.ok(
  validateSchemaSnapshot({
    productKey: 'bad',
    productVersion: '1',
    tables: [{ key: 'dbo.bad', columns: [{}], keys: [], indexes: [] }],
    foreignKeys: [{ name: 'FK_bad' }],
  }).some((error) => error.includes('missing data type')),
);

const boundaryFallback = getErrorBoundaryFallback(new Error('Boundary test failure'));
assert.equal(boundaryFallback.title, 'Unable to render this view');
assert.equal(boundaryFallback.message, 'Boundary test failure');

assert.deepEqual(validateData(), []);
const dataReport = validateDataReport();
assert.equal(dataReport.errors.length, 0);
assert.equal(dataReport.dependencyStats['lfds 12.0.2506.370'].resolved, 36);
assert.ok(dataReport.dependencyStats['repository 12.0.1.237'].unresolvedReferencing > 0);
assert.deepEqual(
  Object.fromEntries(Object.entries(dataReport.dependencyStats).map(([key, value]) => [
    key,
    { total: value.total, resolved: value.resolved },
  ])),
  {
    'forms 11.0.2311.50564': { total: 146, resolved: 104 },
    'forms 12.0.2503.10378': { total: 155, resolved: 112 },
    'forms 12.0.2509.20409': { total: 154, resolved: 112 },
    'forms 12.0.2603.30215': { total: 226, resolved: 181 },
    'forms 12.0.2607.40137': { total: 154, resolved: 112 },
    'lfds 11.0.2403.2474': { total: 37, resolved: 36 },
    'lfds 12.0.2506.370': { total: 37, resolved: 36 },
    'lfds 12.0.2510.261': { total: 38, resolved: 36 },
    'lfds 12.0.2511.289': { total: 42, resolved: 40 },
    'lfds 12.0.2603.369': { total: 41, resolved: 40 },
    'lfds 12.0.2607.421': { total: 37, resolved: 36 },
    'repository 11.0.2.338': { total: 350, resolved: 240 },
    'repository 12.0.1.237': { total: 350, resolved: 240 },
    'repository 12.0.2.343': { total: 360, resolved: 247 },
    'repository 12.0.3.423': { total: 367, resolved: 257 },
    'repository 12.0.4.433': { total: 352, resolved: 242 },
    'workflow 11.0.2306.898': { total: 199, resolved: 198 },
    'workflow 12.0.2508.3111': { total: 200, resolved: 199 },
    'workflow 12.0.2510.3321': { total: 206, resolved: 205 },
    'workflow 12.0.2511.266': { total: 206, resolved: 160 },
    'workflow 12.0.2605.385': { total: 221, resolved: 220 },
  },
);
assert.ok(dataReport.warningsByScope['repository 12.0.1.237'].length > 0);
assert.ok(dataReport.warnings.some((warning) => warning.includes('views export is empty')));
assert.ok(dataReport.warnings.some((warning) => warning.includes('triggers export is empty')));
assert.ok(dataReport.warnings.some((warning) => warning.includes('missing referencing or referenced schema metadata')));
assert.ok(dataReport.warnings.some((warning) => warning.includes('has no exported primary key')));
assert.deepEqual(validateAllNotes(), []);
assert.ok(validateNotesObject({ tables: { 'dbo.bad': { confidence: 'wrong' } } }).some((error) =>
  error.includes('invalid confidence'),
));

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lfdd-import-'));
const inputDir = path.join(tempRoot, 'input');
const outputDir = path.join(tempRoot, 'data', 'fixture', '1.0');
const publicOutputDir = path.join(tempRoot, 'public', 'data', 'fixture', '1.0');
fs.mkdirSync(inputDir, { recursive: true });
const fixtureFileMap = {
  manifest: 'manifest.json',
  schemas: 'schemas.json',
  tables: 'tables.json',
  columns: 'columns.json',
  keys: 'primaryAndUniqueKeys.json',
  foreignKeys: 'foreignKeys.json',
  indexes: 'indexes.json',
  views: 'views.json',
  routines: 'routines.json',
  triggers: 'triggers.json',
  dependencies: 'dependencies.json',
};
Object.entries(fixtureFileMap).forEach(([key, fileName]) => {
  fs.writeFileSync(path.join(inputDir, fileName), `${JSON.stringify(minimalExport[key])}\n`);
});
const originalArgv = process.argv;
process.argv = [
  process.argv[0],
  'tools/import-forms-metadata.mjs',
  `--input-dir=${inputDir}`,
  `--out=${outputDir}`,
  `--public-out=${publicOutputDir}`,
  `--public-versions-out=${path.join(tempRoot, 'public', 'data', 'fixture', 'versions.json')}`,
  `--public-products-out=${path.join(tempRoot, 'public', 'data', 'products.json')}`,
];
try {
  runImport();
} finally {
  process.argv = originalArgv;
}
assert.equal(readJson(path.join(outputDir, 'schema.json')).productKey, 'fixture');
assert.equal(readJson(path.join(publicOutputDir, 'schema.json')).tables.length, 2);
assert.equal(readJson(path.join(tempRoot, 'public', 'data', 'products.json')).products[0].productKey, 'fixture');

fs.writeFileSync(
  path.join(inputDir, 'manifest.json'),
  `${JSON.stringify([{ ...minimalExport.manifest[0], productKey: '../outside' }])}\n`,
);
process.argv = [
  process.argv[0],
  'tools/import-forms-metadata.mjs',
  `--input-dir=${inputDir}`,
  `--out=${path.join(tempRoot, 'malicious-data')}`,
  `--public-out=${path.join(tempRoot, 'malicious-public')}`,
  `--public-versions-out=${path.join(tempRoot, 'malicious-versions.json')}`,
  `--public-products-out=${path.join(tempRoot, 'malicious-products.json')}`,
];
try {
  assert.throws(() => runImport(), /productKey contains unsupported path characters/);
} finally {
  process.argv = originalArgv;
}

console.log(
  JSON.stringify(
    {
      product: product.id,
      versions: product.versions.length,
      changedTables: comparison.changedTables.length,
      reportingExamples: examples.length,
      impactItems: impactItems.length,
      healthItems: healthItems.length,
      fixtureTables: normalizedFixture.tables.length,
      diagramEdges: focusedDiagram.edges.length,
      connectorRegressionPath: connectorRegressionGeometry.path,
      cliImportTables: readJson(path.join(outputDir, 'schema.json')).tables.length,
    },
    null,
    2,
  ),
);
