import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDatabaseDiagram } from '../src/data/diagram.js';
import { getEdgeGeometry } from '../src/data/diagramGeometry.js';

const table = name => ({key:`dbo.${name}`,name,schemaName:'dbo',columns:[],keys:[]});
const fk = (name,from,to) => ({name,sourceTableKey:`dbo.${from}`,referencedTableKey:`dbo.${to}`,columns:[]});
const version = {source:{tables:['root','a','b','shared','leaf','isolated'].map(table),
  foreignKeys:[fk('root_a','root','a'),fk('root_b','b','root'),fk('a_shared','a','shared'),fk('b_shared','b','shared'),fk('shared_leaf','shared','leaf'),fk('self','root','root')],
  views:[{key:'dbo.v',name:'v',schemaName:'dbo'}],routines:[],
  triggers:[{name:'tr_root',parentObjectKey:'dbo.root'}],
  dependencies:[{referencingObjectKey:'dbo.v',referencedObjectKey:'dbo.root'}, {referencingObjectKey:'dbo.v',referencedObjectKey:'dbo.missing'}],
}};
const build = (expandedKeys=[],focus='dbo.root',filters={},edgeType='all') => buildDatabaseDiagram(version,'unrelated search',edgeType,focus,'focused',2,filters,{exploration:true,expandedKeys});
test('initial selection hides unrelated objects, includes both directions and trigger parent',()=>{
  const graph = build();
  assert.deepEqual(new Set(graph.nodes.map(n=>n.key)),new Set(['dbo.root','dbo.a','dbo.b','dbo.v','tr_root']));
  assert.ok(graph.edges.some(e=>e.type==='triggerParent'));
  assert.ok(graph.edges.some(e=>e.from===e.to));
  assert.ok(graph.positionedByKey.get('dbo.b').x < graph.positionedByKey.get('dbo.root').x);
  assert.ok(graph.positionedByKey.get('dbo.a').x > graph.positionedByKey.get('dbo.root').x);
  assert.equal(graph.unresolvedDependencyCount,1);
});
test('expansion is selective; collapsing prunes unreachable descendants but preserves shared branches',()=>{
  assert.ok(build(['dbo.a']).positionedByKey.has('dbo.shared'));
  assert.ok(!build(['dbo.a']).positionedByKey.has('dbo.leaf'));
  assert.ok(build(['dbo.a','dbo.shared']).positionedByKey.has('dbo.leaf'));
  assert.ok(!build(['dbo.shared']).positionedByKey.has('dbo.leaf'));
  assert.ok(build(['dbo.b','dbo.shared']).positionedByKey.has('dbo.leaf'));
  assert.ok(!build(['dbo.isolated']).positionedByKey.has('dbo.isolated'));
});
test('filters prune hidden objects; isolated and missing roots do not show the full database',()=>{
  assert.ok(!build([], 'dbo.root', {view:false,trigger:false}).positionedByKey.has('dbo.v'));
  assert.equal(build([], 'dbo.isolated').nodes.length,1);
  assert.equal(build([], '').nodes.length,0);
  assert.equal(build([], 'dbo.nonexistent').nodes.length,0);
  assert.deepEqual(build([], 'tr_root',{},'triggerParent').nodes.map(n=>n.key).sort(),['dbo.root','tr_root']);
});
test('all visible edges have finite geometry and object boxes do not overlap',()=>{
  const graph = build(['dbo.a','dbo.b','dbo.shared']);
  for(const edge of graph.edges) {
    const geometry=getEdgeGeometry(edge,graph,{focusKey:'dbo.root',mode:'focused'});
    assert.ok(geometry);
    assert.doesNotMatch(geometry.path,/NaN|undefined|Infinity/);
  }
  for(const a of graph.nodes) for(const b of graph.nodes) if(a.key!==b.key) {
    assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
  }
});
