const confidenceDescriptions = [
  ['unknown', 'Unknown', 'Generated from SQL Server metadata and still needs manual review.'],
  ['inferred', 'Inferred', 'Meaning was inferred from names or relationships and should be verified before reporting.'],
  ['observed', 'Observed', 'Meaning has been observed in schema behavior or examples, but may still need final review.'],
  ['confirmed', 'Confirmed', 'Purpose and reporting guidance have been reviewed for the documented version.'],
  ['deprecated', 'Deprecated', 'Object exists but appears replaced, old, or not recommended for new reporting.'],
  ['do_not_rely_on', 'Do not rely', 'Avoid using this object for reporting unless Laserfiche support or product documentation confirms it.'],
];

export function getConfidenceLegendItems() {
  return confidenceDescriptions.map(([value, label, description]) => ({ value, label, description }));
}

function objectKey(object, index = 0) {
  return object.key ?? object.name ?? object.referencingObjectKey ?? `object-${index + 1}`;
}

function definitionText(object) {
  return object.definition ?? object.definitionText ?? object.sqlDefinition ?? object.objectDefinition ?? '';
}

function normalize(value) {
  return String(value ?? '').toLowerCase().trim();
}

export function getVersionChangeSummary(comparison) {
  if (!comparison) {
    return [];
  }

  const objectChanges = Object.values(comparison.objectChanges ?? {}).reduce(
    (total, group) => total + group.added.length + group.removed.length + group.changed.length,
    0,
  );
  const dependencyChanges =
    (comparison.dependencyChanges?.added.length ?? 0) + (comparison.dependencyChanges?.removed.length ?? 0);
  const changedColumns = comparison.changedTables.reduce(
    (total, table) => total + table.addedColumns.length + table.removedColumns.length + table.changedColumns.length,
    0,
  );
  const relationshipChanges = comparison.changedTables.reduce(
    (total, table) =>
      total + table.addedForeignKeys.length + table.removedForeignKeys.length + table.changedForeignKeys.length,
    0,
  );
  const keyIndexChanges = comparison.changedTables.reduce(
    (total, table) =>
      total +
      table.addedKeys.length +
      table.removedKeys.length +
      table.changedKeys.length +
      table.addedIndexes.length +
      table.removedIndexes.length +
      table.changedIndexes.length,
    0,
  );

  return [
    `${comparison.addedTables.length.toLocaleString()} tables added, ${comparison.removedTables.length.toLocaleString()} removed, and ${comparison.changedTables.length.toLocaleString()} changed.`,
    `${changedColumns.toLocaleString()} column-level changes were detected across changed tables.`,
    `${relationshipChanges.toLocaleString()} foreign-key changes and ${keyIndexChanges.toLocaleString()} key/index changes were detected.`,
    `${objectChanges.toLocaleString()} view/routine/trigger changes and ${dependencyChanges.toLocaleString()} dependency changes were detected.`,
  ];
}

export function getTableChangeSeverity(tableChange) {
  if (!tableChange) {
    return { level: 'low', label: 'Low', reason: 'No table change selected.' };
  }
  if (
    tableChange.removedColumns.length > 0 ||
    tableChange.removedKeys.length > 0 ||
    tableChange.removedForeignKeys.length > 0 ||
    tableChange.changedColumns.some((column) => column.changes.includes('type'))
  ) {
    return { level: 'high', label: 'High', reason: 'Removed objects or column type changes can break reports.' };
  }
  if (
    tableChange.changedColumns.some((column) => column.changes.includes('nullability')) ||
    tableChange.changedKeys.length > 0 ||
    tableChange.changedIndexes.length > 0 ||
    tableChange.changedForeignKeys.length > 0
  ) {
    return { level: 'medium', label: 'Medium', reason: 'Join, nullability, key, or index behavior changed.' };
  }
  return { level: 'low', label: 'Low', reason: 'Changes are additive or low-risk for existing read-only reports.' };
}

export function isBreakingTableChange(tableChange) {
  const severity = getTableChangeSeverity(tableChange);
  return severity.level === 'high';
}

export function getComparisonSeverityCounts(comparison) {
  return comparison.changedTables.reduce(
    (counts, table) => {
      const severity = getTableChangeSeverity(table).level;
      counts[severity] += 1;
      return counts;
    },
    { low: 0, medium: 0, high: 0 },
  );
}

export function getSchemaCoverageGaps(productsManifest, product) {
  const products = productsManifest?.products ?? [];
  const plannedProducts = products
    .filter((item) => item.status !== 'available')
    .map((item) => `${item.productName ?? item.productKey} is listed but not yet available.`);
  const versionCount = product?.versions?.length ?? 0;
  const productVersionGap =
    versionCount < 2
      ? [`${product?.name ?? 'Selected product'} has fewer than two imported versions, so trend and comparison coverage is limited.`]
      : [];
  const missingTriggers = (product?.versions ?? [])
    .filter((version) => version.isLoaded !== false && (version.source?.triggers?.length ?? 0) === 0)
    .map((version) => `${product.name} ${version.version} has no exported triggers.`);
  const missingViews = (product?.versions ?? [])
    .filter((version) => version.isLoaded !== false && (version.source?.views?.length ?? 0) === 0)
    .map((version) => `${product.name} ${version.version} has no exported views.`);
  const missingDependencies = (product?.versions ?? [])
    .filter((version) => version.isLoaded !== false && (version.source?.dependencies?.length ?? 0) === 0)
    .map((version) => `${product.name} ${version.version} has no exported dependencies.`);

  return [
    ...plannedProducts,
    ...productVersionGap,
    ...missingTriggers,
    ...missingViews,
    ...missingDependencies,
  ];
}

export function getTableStability(version, tableKey) {
  const versions = version?.productVersions ?? [];
  if (versions.length === 0) {
    return null;
  }
  if (versions.some((item) => item.isLoaded === false)) {
    return { pending: true, versionCount: versions.length, stable: null };
  }
  const appearances = versions.filter((item) => item.source.tables.some((table) => table.key === tableKey));
  const firstSeen = appearances[0]?.version ?? '';
  const lastSeen = appearances.at(-1)?.version ?? '';
  return {
    firstSeen,
    lastSeen,
    appearanceCount: appearances.length,
    versionCount: versions.length,
    stable: appearances.length === versions.length,
  };
}

export function getTableVersionTrend(version, tableKey) {
  const versions = version?.productVersions ?? [];
  return versions.map((item) => {
    const table = item.source.tables.find((candidate) => candidate.key === tableKey);
    return {
      version: item.version,
      present: item.isLoaded === false ? null : Boolean(table),
      columns: table?.columns.length ?? 0,
      keys: table?.keys.length ?? 0,
      indexes: table?.indexes.length ?? 0,
      foreignKeys: table?.outgoingForeignKeys?.length ?? 0,
    };
  });
}

export function getColumnLifecycleItems(version, tableKey) {
  const versions = version?.productVersions ?? [];
  if (versions.some((item) => item.isLoaded === false)) return [];
  const lifecycles = new Map();
  versions.forEach((item) => {
    const table = item.source.tables.find((candidate) => candidate.key === tableKey);
    (table?.columns ?? []).forEach((column) => {
      const current = lifecycles.get(column.name) ?? {
        name: column.name,
        firstSeen: item.version,
        lastSeen: item.version,
        versionCount: 0,
        types: new Set(),
      };
      current.lastSeen = item.version;
      current.versionCount += 1;
      current.types.add(column.typeDefinition ?? column.dataType);
      lifecycles.set(column.name, current);
    });
  });

  return [...lifecycles.values()]
    .map((item) => ({
      ...item,
      typeCount: item.types.size,
      types: [...item.types].join(', '),
      stable: item.versionCount === versions.length && item.types.size === 1,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
}

export function attachProductVersions(product) {
  return {
    ...product,
    versions: product.versions.map((version) => ({ ...version, productVersions: product.versions })),
  };
}

function relatedDependencyItems(dependencies) {
  return [...new Map(dependencies.map((dependency) => {
    const key = `${dependency.referencingObjectKey ?? dependency.referencingObjectName} -> ${dependency.referencedObjectKey ?? dependency.referencedEntityName}`;
    return [key, { key, description: dependency.referencingObjectTypeDescription ?? dependency.referencedObjectTypeDescription ?? 'Dependency' }];
  })).values()];
}

export function getRelatedObjectItems(version, tableKey) {
  const relatedDependencies = (version.source.dependencies ?? []).filter((dependency) =>
    [dependency.referencingObjectKey, dependency.referencedObjectKey, dependency.referencingObjectName, dependency.referencedEntityName]
      .map(normalize)
      .some((value) => value === normalize(tableKey) || value.endsWith(`.${normalize(tableKey.split('.').at(-1))}`)),
  );
  const relatedViews = (version.source.views ?? []).filter((view) =>
    relatedDependencies.some((dependency) => dependency.referencingObjectKey === view.key || dependency.referencedObjectKey === view.key),
  );
  const relatedRoutines = (version.source.routines ?? []).filter((routine) =>
    relatedDependencies.some((dependency) => dependency.referencingObjectKey === routine.key || dependency.referencedObjectKey === routine.key),
  );
  const relatedTriggers = (version.source.triggers ?? []).filter((trigger) => trigger.parentObjectKey === tableKey);

  return {
    dependencies: relatedDependencyItems(relatedDependencies),
    views: relatedViews.map((view, index) => ({ key: objectKey(view, index), description: view.typeDescription ?? 'View' })),
    routines: relatedRoutines.map((routine, index) => ({
      key: objectKey(routine, index),
      description: routine.typeDescription ?? 'Routine',
    })),
    triggers: relatedTriggers.map((trigger, index) => ({
      key: objectKey(trigger, index),
      description: trigger.isDisabled ? 'Disabled trigger' : 'Trigger',
    })),
  };
}

export function getObjectRelatedItems(version, selectedObject) {
  const key = objectKey(selectedObject);
  const dependencies = (version.source.dependencies ?? []).filter(
    (dependency) => dependency.referencingObjectKey === key || dependency.referencedObjectKey === key,
  );
  const parent = selectedObject.parentObjectKey
    ? [{ key: selectedObject.parentObjectKey, description: 'Parent table' }]
    : [];
  return {
    parent,
    dependencies: relatedDependencyItems(dependencies),
  };
}

export function buildGlobalSearchItems(version, tables) {
  const tableItems = tables.map((table) => ({
    type: 'Table',
    label: table.id,
    searchText: `${table.id} ${table.summary} ${table.safeReportingNotes.join(' ')} ${table.warnings.join(' ')}`,
    tableKey: table.id,
  }));
  const columnItems = tables.flatMap((table) =>
    table.columns.map((column) => ({
      type: 'Column',
      label: `${table.id}.${column.name}`,
      searchText: `${table.id} ${column.name} ${column.dataType} ${column.purpose}`,
      tableKey: table.id,
    })),
  );
  const relationshipItems = tables.flatMap((table) =>
    table.relationships.map((relationship) => ({
      type: 'Relationship',
      label: `${table.id} ${relationship.type} ${relationship.table}`,
      searchText: `${table.id} ${relationship.type} ${relationship.table} ${relationship.note}`,
      tableKey: table.id,
    })),
  );
  const objectItems = [
    ...(version.source.views ?? []).map((object, index) => ({
      type: 'View',
      label: objectKey(object, index),
      searchText: `${objectKey(object, index)} ${object.typeDescription} ${definitionText(object)}`,
      objectType: 'views',
    })),
    ...(version.source.routines ?? []).map((object, index) => ({
      type: 'Routine',
      label: objectKey(object, index),
      searchText: `${objectKey(object, index)} ${object.typeDescription} ${definitionText(object)}`,
      objectType: 'routines',
    })),
    ...(version.source.triggers ?? []).map((object, index) => ({
      type: 'Trigger',
      label: objectKey(object, index),
      searchText: `${objectKey(object, index)} ${object.typeDescription} ${definitionText(object)} ${object.parentObjectKey}`,
      objectType: 'triggers',
      tableKey: object.parentObjectKey,
    })),
  ];
  return [...tableItems, ...columnItems, ...relationshipItems, ...objectItems];
}
