import fs from 'node:fs';
import path from 'node:path';
import { validateDataReport } from './validate-data.mjs';
import { getDependencyResolutionItems, classifyDependency } from '../src/data/schemaAnalysis.js';

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const validation = validateDataReport();
const snapshots = [];
for (const product of read('data/products.json').products.filter((item) => item.status !== 'pending')) {
  for (const version of read(`data/${product.productKey}/versions.json`).versions) {
    const schema = read(`public${version.schemaUrl}`);
    const notes = read(`public${version.notesUrl}`);
    const unresolved = getDependencyResolutionItems({ source: schema }).filter((item) =>
      !item.referencingResolvedKey || !item.referencedResolvedKey);
    const missingViews = [...new Set(unresolved.filter((item) =>
      item.referencingObjectTypeDescription === 'VIEW' && !item.referencingResolvedKey)
      .map((item) => item.referencingObjectKey))];
    const targets = unresolved.filter((item) => !item.referencedResolvedKey).map((item) => {
      const dependency = schema.dependencies[item.index];
      const routine = schema.routines.find((object) => object.key === dependency.referencingObjectKey);
      const parameterTypeEvidence = (routine?.parameters ?? []).filter((parameter) =>
        parameter.dataType === dependency.referencedEntityName).map((parameter) => parameter.parameterName);
      return { ...item, ...classifyDependency(dependency), parameterTypeEvidence,
        action: parameterTypeEvidence.length ? 'Parameter type name is exported; its definition is not. Do not invent a table.' : item.suggestedFix };
    });
    const unknownNotes = schema.tables.flatMap((table) => table.columns.filter((column) =>
      notes.tables?.[table.key]?.columns?.[column.name]?.confidence === 'unknown')
      .map((column) => ({ table: table.key, column: column.name, type: column.typeDefinition,
        purpose: notes.tables[table.key].columns[column.name].purpose })));
    snapshots.push({ product: product.productKey, version: version.version,
      warningCount: validation.warningsByScope[`${product.productKey} ${version.version}`]?.length ?? 0,
      missingViews, targets, unknownNotes });
  }
}
const report = { errors: validation.errors, warningCount: validation.warnings.length,
  recovery: 'Workflow 12.0.2511.266 needs its original views export; do not substitute another version.', snapshots };
const destination = path.resolve('artifacts/metadata-triage.json');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ destination, warningCount: report.warningCount,
  missingViewSnapshots: snapshots.filter((snapshot) => snapshot.missingViews.length).map(({ product, version, missingViews }) => ({ product, version, missingViews })),
  unknownNoteCount: snapshots.reduce((sum, snapshot) => sum + snapshot.unknownNotes.length, 0) }, null, 2));
