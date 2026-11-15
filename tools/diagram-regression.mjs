import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDatabaseDiagram } from '../src/data/diagram.js';
import { getEdgeGeometry } from '../src/data/diagramGeometry.js';
import { buildSchemaProduct } from '../src/data/schemaDictionary.js';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const lfds = buildSchemaProduct([
  {
    schema: readJson('public/data/lfds/12.0.2506.370/schema.json'),
    notes: readJson('public/data/lfds/12.0.2506.370/notes.json'),
  },
]);
const forms = buildSchemaProduct([
  {
    schema: readJson('public/data/forms/12.0.2503.10378/schema.json'),
    notes: readJson('public/data/forms/12.0.2503.10378/notes.json'),
  },
]);

const lfdsVersion = lfds.versions[0];
const formsVersion = forms.versions[0];

const neighborhoodFocus = 'dbo.cf_bp_worker_instnc_to_resume';
const neighborhood = buildDatabaseDiagram(formsVersion, '', 'all', neighborhoodFocus, 'focused', 1,
  { table: true, view: true, routine: true, trigger: true }, { exploration: true });
const sameLaneEdges = neighborhood.edges.filter(edge => neighborhood.positionedByKey.get(edge.from).x === neighborhood.positionedByKey.get(edge.to).x);
assert.ok(sameLaneEdges.some(edge => edge.from === edge.to), 'Real self-references remain present.');
assert.ok(sameLaneEdges.some(edge => edge.from !== edge.to), 'Connected branches in the same lane remain present.');
for (const curve of [false, true]) {
  for (const edge of sameLaneEdges) {
    const from = neighborhood.positionedByKey.get(edge.from);
    const to = neighborhood.positionedByKey.get(edge.to);
    const geometry = getEdgeGeometry(edge, neighborhood, { mode: 'focused', focusKey: neighborhoodFocus, curve });
    const left = from.lane === 'Outgoing';
    assert.equal(geometry.startX, left ? from.x : from.x + from.width);
    assert.equal(geometry.endX, left ? to.x : to.x + to.width);
    assert.ok(left ? geometry.midX < from.x : geometry.midX > from.x + from.width);
    assert.ok(geometry.midX >= 0 && geometry.midX <= neighborhood.width);
    if (edge.from === edge.to) assert.ok(Math.abs(geometry.endY - geometry.startY) >= 12);
    assert.equal(geometry.path.includes(' C '), curve);
  }
}
const workerSelfEdges = sameLaneEdges.filter(edge => edge.from === 'dbo.cf_bp_worker_instances' && edge.to === edge.from);
assert.equal(new Set(workerSelfEdges.map(edge => getEdgeGeometry(edge, neighborhood, { mode: 'focused', focusKey: neighborhoodFocus }).midX)).size, workerSelfEdges.length);

const adgsOneHop = buildDatabaseDiagram(lfdsVersion, 'adgs_rules', 'foreignKey', 'dbo.adgs_rules', 'focused', 1);
assert.equal(adgsOneHop.nodes.length, 3);
assert.equal(adgsOneHop.edges.length, 2);
assert.deepEqual(
  adgsOneHop.edges.map((edge) => edge.label).sort(),
  ['adgs_rules_directory_objects_fk', 'adgs_rules_identity_providers_fk'],
);

const adgsTwoHop = buildDatabaseDiagram(lfdsVersion, '', 'foreignKey', 'dbo.adgs_rules', 'focused', 2);
assert.ok(adgsTwoHop.nodes.length > adgsOneHop.nodes.length);
assert.ok(adgsTwoHop.edges.length > adgsOneHop.edges.length);
assert.ok(adgsTwoHop.edges.some((edge) => edge.hop === 2));
assert.equal(adgsTwoHop.edges.filter((edge) => edge.hop === 1).length, 2);

const adgsTwoHopFiltered = buildDatabaseDiagram(
  lfdsVersion,
  'adgs_rules',
  'foreignKey',
  'dbo.adgs_rules',
  'focused',
  2,
);
assert.ok(adgsTwoHopFiltered.edges.length < adgsTwoHop.edges.length);
assert.ok(adgsTwoHopFiltered.edges.some((edge) => edge.hop === 2));

const adgsDependency = buildDatabaseDiagram(
  lfdsVersion,
  'adgs_rules',
  'dependency',
  'dbo.adgs_rules',
  'focused',
  1,
);
assert.equal(adgsDependency.edges.length, 1);
assert.deepEqual(adgsDependency.edges.map((edge) => [edge.from, edge.to]), [
  ['dbo.create_adgs_rule', 'dbo.adgs_rules'],
]);
assert.equal(adgsDependency.relationshipDetails[0].direction, 'depended on by');
assert.deepEqual(
  new Set(adgsDependency.nodes.map((node) => node.type)),
  new Set(['table', 'routine']),
);

const adgsMixed = buildDatabaseDiagram(
  lfdsVersion,
  'adgs_rules',
  'all',
  'dbo.adgs_rules',
  'focused',
  1,
);
assert.equal(adgsMixed.edges.filter((edge) => edge.type === 'foreignKey').length, 2);
assert.equal(adgsMixed.edges.filter((edge) => edge.type === 'dependency').length, 1);

const audit = buildDatabaseDiagram(
  lfdsVersion,
  'attribute_def_acls_audit',
  'foreignKey',
  'dbo.attribute_def_acls_audit',
  'focused',
  1,
);
const auditGeometry = getEdgeGeometry(audit.edges[0], audit, {
  mode: 'focused',
  focusKey: 'dbo.attribute_def_acls_audit',
});
assert.equal(auditGeometry.startX, audit.positionedByKey.get('dbo.attribute_def_acls_audit').x + 250);
assert.equal(auditGeometry.endX, audit.positionedByKey.get('dbo.audit_events').x);

const syntheticDiagram = {
  edges: [
    {
      id: 'fk_one',
      from: 'dbo.source',
      to: 'dbo.target',
      columns: [{ sourceColumnName: 'visible_id', referencedColumnName: 'id' }],
    },
    {
      id: 'fk_two',
      from: 'dbo.source',
      to: 'dbo.target',
      columns: [{ sourceColumnName: 'hidden_id', referencedColumnName: 'id' }],
    },
  ],
  positionedByKey: new Map([
    [
      'dbo.source',
      {
        key: 'dbo.source',
        x: 20,
        y: 20,
        width: 250,
        height: 90,
        columns: [
          { name: 'visible_id' },
          { name: 'filler_01' },
          { name: 'filler_02' },
          { name: 'filler_03' },
          { name: 'filler_04' },
          { name: 'hidden_id' },
        ],
      },
    ],
    [
      'dbo.target',
      {
        key: 'dbo.target',
        x: 420,
        y: 20,
        width: 250,
        height: 90,
        columns: [{ name: 'id' }],
      },
    ],
  ]),
};
const firstSyntheticGeometry = getEdgeGeometry(syntheticDiagram.edges[0], syntheticDiagram, { mode: 'full' });
const secondSyntheticGeometry = getEdgeGeometry(syntheticDiagram.edges[1], syntheticDiagram, { curve: true, mode: 'full' });
assert.notEqual(firstSyntheticGeometry.midX, secondSyntheticGeometry.midX);
assert.equal(secondSyntheticGeometry.usesBundling, true);
assert.equal(secondSyntheticGeometry.sourceColumnHidden, true);
assert.match(secondSyntheticGeometry.path, /^M .+ C /);

const businessProcessTwoHop = buildDatabaseDiagram(
  formsVersion,
  '',
  'foreignKey',
  'dbo.cf_business_processes',
  'focused',
  2,
);
assert.ok(businessProcessTwoHop.edges.some((edge) => edge.hop === 2));

console.log(
  JSON.stringify(
    {
      adgsOneHopEdges: adgsOneHop.edges.length,
      adgsTwoHopEdges: adgsTwoHop.edges.length,
      adgsTwoHopFilteredEdges: adgsTwoHopFiltered.edges.length,
      adgsDependencyEdges: adgsDependency.edges.length,
      adgsMixedEdges: adgsMixed.edges.length,
      adgsTwoHopObjects: adgsTwoHop.nodes.length,
      auditPath: auditGeometry.path,
      businessProcessTwoHopEdges: businessProcessTwoHop.edges.length,
      syntheticBundled: secondSyntheticGeometry.usesBundling,
      syntheticHiddenColumnFallback: secondSyntheticGeometry.sourceColumnHidden,
    },
    null,
    2,
  ),
);
