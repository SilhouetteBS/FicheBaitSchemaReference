import { getDependencyResolutionItems, getSchemaHealthItems } from './schemaAnalysis.js';

function normalize(value) {
  return String(value ?? '').toLowerCase().trim();
}

export function formatCompletenessValue(value) {
  return value === undefined || value === null || value === '' ? 'Not exported' : String(value);
}

export function getDatabaseRoleExplanation(role) {
  return {
    forms: 'Laserfiche Forms process, submission, form, report, and workflow metadata database.',
    lfds: 'Laserfiche Directory Server identity, licensing, registration, and security metadata database.',
    repository: 'Laserfiche Repository document, trustee, volume, template, field, and audit metadata database.',
    workflow: 'Laserfiche Workflow definition, runtime, schedule, and activity metadata database.',
  }[normalize(role)] ?? 'Laserfiche product database role supplied by the export manifest.';
}

export function getSnapshotCompletenessRows(version) {
  const source = version.source ?? {};
  return [
    ['Schemas', source.schemas?.length ?? 0],
    ['Primary/unique keys', source.tables?.reduce((total, table) => total + (table.keys?.length ?? 0), 0) ?? 0],
    ['Indexes', source.tables?.reduce((total, table) => total + (table.indexes?.length ?? 0), 0) ?? 0],
    ['Views', source.views?.length ?? 0],
    ['Triggers', source.triggers?.length ?? 0],
    ['Dependencies', source.dependencies?.length ?? 0],
  ].map(([label, value]) => ({ label, value: Number(value).toLocaleString() }));
}

export function getVersionTrendRows(product) {
  return product.versions.map((item) => {
    if (item.isLoaded === false) return {
      version: item.version, schemaSize: 'Not loaded', objectCount: 'Not loaded',
      healthIssues: 'Not loaded', dependencyResolution: 'Not loaded', notesCompletion: 'Not loaded',
    };
    const dependencyItems = getDependencyResolutionItems(item);
    const resolvedDependencies = dependencyItems.filter((dependency) =>
      dependency.referencingResolvedKey && dependency.referencedResolvedKey).length;
    const notesCompleted = item.tables.filter((table) => table.hasManualNotes).length;
    return {
      version: item.version,
      schemaSize: JSON.stringify(item.source ?? {}).length,
      objectCount:
        (item.source?.tables?.length ?? 0) +
        (item.source?.views?.length ?? 0) +
        (item.source?.routines?.length ?? 0) +
        (item.source?.triggers?.length ?? 0),
      healthIssues: getSchemaHealthItems(item).length,
      dependencyResolution: dependencyItems.length > 0
        ? `${resolvedDependencies}/${dependencyItems.length}`
        : '0/0',
      notesCompletion: item.tables.length > 0
        ? `${Math.round((notesCompleted / item.tables.length) * 100)}%`
        : '0%',
    };
  });
}

export function getTableCompletionBySchema(version) {
  const bySchema = new Map();
  version.tables.forEach((table) => {
    const schemaName = table.source?.schemaName ?? table.id.split('.')[0] ?? 'unknown';
    const current = bySchema.get(schemaName) ?? { documented: 0, total: 0 };
    current.total += 1;
    if (table.hasManualNotes) {
      current.documented += 1;
    }
    bySchema.set(schemaName, current);
  });
  return [...bySchema.entries()]
    .map(([schemaName, counts]) => ({
      label: schemaName,
      tooltip: `Tables in the ${schemaName} schema with manual notes compared with total exported ${schemaName} tables.`,
      value: `${counts.documented}/${counts.total}`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getObjectCompletionByType(version) {
  const objectGroups = [
    [
      'Tables',
      version.tables,
      (table) => table.hasManualNotes,
      'Exported SQL Server tables. The count shows tables with manual notes compared with total exported tables.',
    ],
    [
      'Views',
      version.source?.views ?? [],
      () => false,
      'Exported SQL Server views. Views are shown for reference and dependency mapping; manual notes currently apply to tables.',
    ],
    [
      'Routines',
      version.source?.routines ?? [],
      () => false,
      'Exported stored procedures and functions. Routines are shown for definition review and dependency mapping; manual notes currently apply to tables.',
    ],
    [
      'Triggers',
      version.source?.triggers ?? [],
      () => false,
      'Exported SQL Server triggers. Triggers are shown for definition review and dependency mapping; manual notes currently apply to tables.',
    ],
  ];
  return objectGroups.map(([label, items, isDocumented, tooltip]) => {
    const documented = items.filter(isDocumented).length;
    return { label, tooltip, value: `${documented}/${items.length}` };
  });
}
