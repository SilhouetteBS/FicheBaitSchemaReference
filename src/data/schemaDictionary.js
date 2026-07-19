const tableGuidance = [
  'Use read-only queries only.',
  'Treat generated schema metadata as structural documentation until manual notes are reviewed.',
  'Validate reporting joins against the target product version before relying on them.',
];

const tableWarnings = [
  'Do not insert, update, or delete Laserfiche product database records directly.',
  'Do not rely on inferred relationships or column meanings until they are documented with confidence labels.',
];

/**
 * @typedef {object} SchemaSnapshot
 * @property {string} productKey Stable product identifier, independent of the SQL Server database name.
 * @property {string} productName Human-readable product name.
 * @property {string} productVersion Product/version label supplied by the export script.
 * @property {Array<object>} tables Normalized SQL Server table metadata.
 * @property {Array<object>} foreignKeys Normalized SQL Server foreign key metadata.
 */

/**
 * @typedef {object} VersionDictionary
 * @property {string} version Product version for this snapshot.
 * @property {Array<object>} tables Table dictionaries used by the UI.
 * @property {SchemaSnapshot} source Original normalized schema snapshot.
 */

function byName(left, right) {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

export function validateSchemaSnapshot(schema) {
  const errors = [];
  if (!schema || typeof schema !== 'object') {
    return ['Schema snapshot is not an object.'];
  }
  if (!schema.productKey) {
    errors.push('Missing productKey.');
  }
  if (!schema.productVersion) {
    errors.push('Missing productVersion.');
  }
  if (!Array.isArray(schema.tables)) {
    errors.push('Missing tables array.');
  }
  if (!Array.isArray(schema.foreignKeys)) {
    errors.push('Missing foreignKeys array.');
  }
  if (Array.isArray(schema.tables)) {
    schema.tables.forEach((table, index) => {
      if (!table.key) {
        errors.push(`Table at index ${index} is missing key.`);
      }
      if (!Array.isArray(table.columns)) {
        errors.push(`Table ${table.key ?? index} is missing columns array.`);
      } else {
        table.columns.forEach((column, columnIndex) => {
          if (!column.name) {
            errors.push(`Table ${table.key ?? index} column at index ${columnIndex} is missing name.`);
          }
          if (!column.dataType && !column.typeDefinition) {
            errors.push(`Table ${table.key ?? index} column ${column.name ?? columnIndex} is missing data type.`);
          }
        });
      }
      if (!Array.isArray(table.keys)) {
        errors.push(`Table ${table.key ?? index} is missing keys array.`);
      }
      if (!Array.isArray(table.indexes)) {
        errors.push(`Table ${table.key ?? index} is missing indexes array.`);
      }
    });
  }
  if (Array.isArray(schema.foreignKeys)) {
    schema.foreignKeys.forEach((foreignKey, index) => {
      if (!foreignKey.name) {
        errors.push(`Foreign key at index ${index} is missing name.`);
      }
      if (!foreignKey.sourceTableKey || !foreignKey.referencedTableKey) {
        errors.push(`Foreign key ${foreignKey.name ?? index} is missing source or referenced table key.`);
      }
      if (!Array.isArray(foreignKey.columns)) {
        errors.push(`Foreign key ${foreignKey.name ?? index} is missing columns array.`);
      }
    });
  }
  return errors;
}

function toShortName(tableKey) {
  return tableKey.replace(/^dbo\./, '').replace(/^cf_/, '');
}

function getPrimaryKeyColumns(table) {
  return new Set(
    table.keys
      .filter((key) => key.type === 'PK')
      .flatMap((key) => key.columns.map((column) => column.columnName)),
  );
}

function getTableNotes(notes, tableKey) {
  return notes?.tables?.[tableKey] ?? {};
}

function getColumnNotes(tableNotes, columnName) {
  return tableNotes?.columns?.[columnName] ?? {};
}

function toColumnDictionary(column, primaryKeyColumns, tableNotes) {
  const columnNotes = getColumnNotes(tableNotes, column.name);
  const isPrimaryKey = primaryKeyColumns.has(column.name);
  const hasManualNotes = Object.keys(columnNotes).length > 0;

  return {
    name: column.name,
    dataType: column.typeDefinition ?? column.dataType,
    nullable: column.isNullable,
    confidence: columnNotes.confidence ?? 'unknown',
    purpose:
      columnNotes.purpose ??
      (isPrimaryKey
        ? 'Generated from SQL Server metadata. Primary key column; manual purpose documentation pending.'
        : 'Generated from SQL Server metadata. Manual purpose documentation pending.'),
    hasManualNotes,
    source: column,
  };
}

function toRelationshipDictionaries(table) {
  const outgoing = (table.outgoingForeignKeys ?? []).map((foreignKey) => ({
    type: 'references',
    table: foreignKey.referencedTableKey,
    shortName: toShortName(foreignKey.referencedTableKey),
    note: `SQL foreign key ${foreignKey.name}.`,
    confidence: 'confirmed',
    constraintName: foreignKey.name,
    columns: foreignKey.columns ?? [],
    deleteAction: foreignKey.deleteAction ?? foreignKey.deleteReferentialActionDescription ?? 'NO_ACTION',
    updateAction: foreignKey.updateAction ?? foreignKey.updateReferentialActionDescription ?? 'NO_ACTION',
    isDisabled: Boolean(foreignKey.isDisabled),
    isNotTrusted: Boolean(foreignKey.isNotTrusted),
  }));

  const incoming = (table.incomingForeignKeys ?? []).map((foreignKey) => ({
    type: 'referenced by',
    table: foreignKey.sourceTableKey,
    shortName: toShortName(foreignKey.sourceTableKey),
    note: `SQL foreign key ${foreignKey.name}.`,
    confidence: 'confirmed',
    constraintName: foreignKey.name,
    columns: foreignKey.columns ?? [],
    deleteAction: foreignKey.deleteAction ?? foreignKey.deleteReferentialActionDescription ?? 'NO_ACTION',
    updateAction: foreignKey.updateAction ?? foreignKey.updateReferentialActionDescription ?? 'NO_ACTION',
    isDisabled: Boolean(foreignKey.isDisabled),
    isNotTrusted: Boolean(foreignKey.isNotTrusted),
  }));

  return [...outgoing, ...incoming].sort((left, right) =>
    `${left.type}:${left.table}`.localeCompare(`${right.type}:${right.table}`, undefined, {
      sensitivity: 'base',
    }),
  );
}

function toTableDictionary(table, notes) {
  const primaryKeyColumns = getPrimaryKeyColumns(table);
  const tableNotes = getTableNotes(notes, table.key);
  const hasManualNotes = Object.keys(tableNotes).length > 0;

  return {
    id: table.key,
    name: table.key,
    shortName: toShortName(table.key),
    confidence: tableNotes.confidence ?? 'unknown',
    summary:
      tableNotes.summary ?? 'Generated from SQL Server metadata. Manual table purpose documentation pending.',
    safeReportingNotes: tableNotes.safeReportingNotes ?? tableGuidance,
    warnings: tableNotes.warnings ?? tableWarnings,
    reviewStatus: tableNotes.reviewStatus ?? 'draft',
    owner: tableNotes.owner ?? '',
    reviewer: tableNotes.reviewer ?? '',
    lastReviewedAt: tableNotes.lastReviewedAt ?? '',
    columns: table.columns.map((column) => toColumnDictionary(column, primaryKeyColumns, tableNotes)),
    relationships: toRelationshipDictionaries(table),
    keys: table.keys,
    indexes: table.indexes ?? [],
    triggers: table.triggers ?? [],
    source: table,
    hasManualNotes,
  };
}

/**
 * Convert one normalized schema snapshot and optional manual notes into UI-facing dictionaries.
 *
 * @param {SchemaSnapshot} schema
 * @param {object} notes
 * @returns {VersionDictionary}
 */
export function toVersionDictionary(schema, notes) {
  return {
    version: schema.productVersion,
    exportedAtUtc: schema.exportedAtUtc,
    tables: schema.tables.map((table) => toTableDictionary(table, notes)),
    source: schema,
  };
}

/**
 * Build a product dictionary from one or more product-version snapshots.
 *
 * @param {Array<{schema: SchemaSnapshot, notes: object}>} versionEntries
 */
export function buildSchemaProduct(versionEntries) {
  const firstSchema = versionEntries[0]?.schema;
  return {
    id: firstSchema?.productKey ?? 'forms',
    name: firstSchema?.productName ?? 'Forms',
    versions: versionEntries.map(({ schema, notes }) => toVersionDictionary(schema, notes)),
  };
}

function asMap(items, getKey) {
  return new Map(items.map((item) => [getKey(item), item]));
}

function summarizeColumnChange(beforeColumn, afterColumn) {
  const changes = [];
  const details = [];
  const addChange = (name, label, beforeValue, afterValue) => {
    if (String(beforeValue ?? '') !== String(afterValue ?? '')) {
      changes.push(name);
      details.push(`${label}: ${beforeValue ?? '(none)'} -> ${afterValue ?? '(none)'}`);
    }
  };
  if ((beforeColumn.typeDefinition ?? beforeColumn.dataType) !== (afterColumn.typeDefinition ?? afterColumn.dataType)) {
    changes.push('type');
    details.push(`type: ${beforeColumn.typeDefinition ?? beforeColumn.dataType} -> ${afterColumn.typeDefinition ?? afterColumn.dataType}`);
  }
  if (beforeColumn.isNullable !== afterColumn.isNullable) {
    changes.push('nullability');
    details.push(`nullable: ${beforeColumn.isNullable ? 'yes' : 'no'} -> ${afterColumn.isNullable ? 'yes' : 'no'}`);
  }
  if ((beforeColumn.defaultDefinition ?? '') !== (afterColumn.defaultDefinition ?? '')) {
    changes.push('default');
    details.push(`default: ${beforeColumn.defaultDefinition || '(none)'} -> ${afterColumn.defaultDefinition || '(none)'}`);
  }
  addChange('ordinal', 'ordinal', beforeColumn.ordinal, afterColumn.ordinal);
  addChange('identity', 'identity', beforeColumn.isIdentity, afterColumn.isIdentity);
  addChange('computed', 'computed', beforeColumn.isComputed, afterColumn.isComputed);
  addChange('rowguid', 'rowguid', beforeColumn.isRowGuidColumn, afterColumn.isRowGuidColumn);
  addChange('collation', 'collation', beforeColumn.collationName, afterColumn.collationName);
  return { changes, details };
}

function summarizeObjectChange(beforeObject, afterObject, fields) {
  return fields
    .filter(([, getValue]) => String(getValue(beforeObject) ?? '') !== String(getValue(afterObject) ?? ''))
    .map(([label, getValue]) => {
      const beforeValue = getValue(beforeObject);
      const afterValue = getValue(afterObject);
      return `${label}: ${beforeValue === '' || beforeValue == null ? '(none)' : beforeValue} -> ${afterValue === '' || afterValue == null ? '(none)' : afterValue}`;
    });
}

function describeColumns(columns = [], { includeIndexDetails = false } = {}) {
  return columns.map((column) => {
    const name = column.columnName;
    if (!includeIndexDetails) {
      return `${name}${column.isDescending ? ' DESC' : ''}`;
    }
    return [
      name,
      column.isIncludedColumn ? 'INCLUDE' : 'KEY',
      column.isDescending ? 'DESC' : 'ASC',
      column.keyOrdinal ?? column.ordinal ?? '',
    ].join(':');
  }).join(', ');
}

function describeRoutineParameters(parameters = []) {
  return parameters.map((parameter) => [
    parameter.parameterName || '(return)',
    parameter.typeDefinition ?? parameter.dataType,
    parameter.maxLength ?? '',
    parameter.precision ?? '',
    parameter.scale ?? '',
    parameter.isOutput ? 'output' : 'input',
  ].join(':')).join(', ');
}

function getObjectChangeKey(object) {
  return object.key ?? object.name ?? `${object.schemaName ?? ''}.${object.name ?? ''}`;
}

function compareSchemaObjects(beforeObjects = [], afterObjects = [], objectType) {
  const beforeMap = asMap(beforeObjects, getObjectChangeKey);
  const afterMap = asMap(afterObjects, getObjectChangeKey);
  const added = [...afterMap.keys()].filter((key) => !beforeMap.has(key)).sort(byName);
  const removed = [...beforeMap.keys()].filter((key) => !afterMap.has(key)).sort(byName);
  const changed = [...afterMap.values()]
    .map((afterObject) => {
      const key = getObjectChangeKey(afterObject);
      const beforeObject = beforeMap.get(key);
      if (!beforeObject) {
        return null;
      }
      const details = summarizeObjectChange(beforeObject, afterObject, [
        ['type', (object) => object.typeDescription ?? object.type],
        ['parent object', (object) => object.parentObjectKey],
        ['disabled', (object) => object.isDisabled],
        ['instead of trigger', (object) => object.isInsteadOfTrigger],
        ['definition', (object) => object.definitionSha256],
        ['parameters', (object) => describeRoutineParameters(object.parameters)],
      ]);
      return details.length > 0 ? { key, objectType, details } : null;
    })
    .filter(Boolean)
    .sort((left, right) => byName(left.key, right.key));

  return { added, removed, changed };
}

function getDependencyChangeKey(dependency) {
  return [
    dependency.referencingObjectKey,
    dependency.referencingObjectTypeDescription,
    dependency.referencedObjectKey,
    dependency.referencedObjectTypeDescription,
    dependency.isSchemaBoundReference ? 'schema-bound' : '',
    dependency.isCallerDependent ? 'caller-dependent' : '',
    dependency.isAmbiguous ? 'ambiguous' : '',
  ].map((value) => String(value ?? '').toLowerCase()).join('|');
}

function describeDependency(dependency) {
  const referencing = dependency.referencingObjectKey ?? dependency.referencingObjectName ?? '(unknown)';
  const referenced = dependency.referencedObjectKey ?? dependency.referencedEntityName ?? '(unknown)';
  return `${referencing} -> ${referenced}`;
}

function compareDependencies(beforeDependencies = [], afterDependencies = []) {
  const beforeMap = asMap(beforeDependencies, getDependencyChangeKey);
  const afterMap = asMap(afterDependencies, getDependencyChangeKey);
  return {
    added: [...afterMap.entries()]
      .filter(([key]) => !beforeMap.has(key))
      .map(([, dependency]) => describeDependency(dependency))
      .sort(byName),
    removed: [...beforeMap.entries()]
      .filter(([key]) => !afterMap.has(key))
      .map(([, dependency]) => describeDependency(dependency))
      .sort(byName),
  };
}

function compareTables(beforeTable, afterTable) {
  const beforeColumns = asMap(beforeTable.columns, (column) => column.name);
  const afterColumns = asMap(afterTable.columns, (column) => column.name);
  const addedColumns = [...afterColumns.keys()].filter((name) => !beforeColumns.has(name)).sort(byName);
  const removedColumns = [...beforeColumns.keys()].filter((name) => !afterColumns.has(name)).sort(byName);
  const changedColumns = [...afterColumns.values()]
    .map((afterColumn) => {
      const beforeColumn = beforeColumns.get(afterColumn.name);
      if (!beforeColumn) {
        return null;
      }
      const { changes, details } = summarizeColumnChange(beforeColumn, afterColumn);
      return changes.length > 0 ? { name: afterColumn.name, changes, details } : null;
    })
    .filter(Boolean)
    .sort((left, right) => byName(left.name, right.name));

  const beforeKeys = asMap(beforeTable.keys ?? [], (key) => key.name);
  const afterKeys = asMap(afterTable.keys ?? [], (key) => key.name);
  const addedKeys = [...afterKeys.keys()].filter((name) => !beforeKeys.has(name)).sort(byName);
  const removedKeys = [...beforeKeys.keys()].filter((name) => !afterKeys.has(name)).sort(byName);
  const changedKeys = [...afterKeys.values()]
    .map((afterKey) => {
      const beforeKey = beforeKeys.get(afterKey.name);
      if (!beforeKey) {
        return null;
      }
      const details = summarizeObjectChange(beforeKey, afterKey, [
        ['type', (key) => key.typeDescription ?? key.type],
        ['backing index', (key) => key.backingIndexName],
        ['columns', (key) => describeColumns(key.columns)],
      ]);
      return details.length > 0 ? { name: afterKey.name, details } : null;
    })
    .filter(Boolean)
    .sort((left, right) => byName(left.name, right.name));

  const beforeIndexes = asMap(beforeTable.indexes ?? [], (index) => index.name);
  const afterIndexes = asMap(afterTable.indexes ?? [], (index) => index.name);
  const addedIndexes = [...afterIndexes.keys()].filter((name) => !beforeIndexes.has(name)).sort(byName);
  const removedIndexes = [...beforeIndexes.keys()].filter((name) => !afterIndexes.has(name)).sort(byName);
  const changedIndexes = [...afterIndexes.values()]
    .map((afterIndex) => {
      const beforeIndex = beforeIndexes.get(afterIndex.name);
      if (!beforeIndex) {
        return null;
      }
      const details = summarizeObjectChange(beforeIndex, afterIndex, [
        ['type', (index) => index.typeDescription ?? index.type],
        ['unique', (index) => index.isUnique],
        ['primary key', (index) => index.isPrimaryKey],
        ['unique constraint', (index) => index.isUniqueConstraint],
        ['filtered', (index) => index.hasFilter],
        ['filter', (index) => index.filterDefinition],
        ['columns', (index) => describeColumns(index.columns, { includeIndexDetails: true })],
      ]);
      return details.length > 0 ? { name: afterIndex.name, details } : null;
    })
    .filter(Boolean)
    .sort((left, right) => byName(left.name, right.name));

  const beforeForeignKeys = asMap(beforeTable.outgoingForeignKeys ?? [], (foreignKey) => foreignKey.name);
  const afterForeignKeys = asMap(afterTable.outgoingForeignKeys ?? [], (foreignKey) => foreignKey.name);
  const addedForeignKeys = [...afterForeignKeys.keys()].filter((name) => !beforeForeignKeys.has(name)).sort(byName);
  const removedForeignKeys = [...beforeForeignKeys.keys()].filter((name) => !afterForeignKeys.has(name)).sort(byName);
  const changedForeignKeys = [...afterForeignKeys.values()]
    .map((afterForeignKey) => {
      const beforeForeignKey = beforeForeignKeys.get(afterForeignKey.name);
      if (!beforeForeignKey) {
        return null;
      }
      const details = summarizeObjectChange(beforeForeignKey, afterForeignKey, [
        ['target table', (foreignKey) => foreignKey.referencedTableKey],
        ['delete action', (foreignKey) => foreignKey.deleteAction],
        ['update action', (foreignKey) => foreignKey.updateAction],
        ['disabled', (foreignKey) => foreignKey.isDisabled],
        ['not trusted', (foreignKey) => foreignKey.isNotTrusted],
        ['columns', (foreignKey) =>
          (foreignKey.columns ?? [])
            .map((column) => `${column.ordinal ?? ''}:${column.sourceColumnName ?? column.parentColumnName} -> ${column.referencedColumnName}`)
            .join(', ')],
      ]);
      return details.length > 0 ? { name: afterForeignKey.name, details } : null;
    })
    .filter(Boolean)
    .sort((left, right) => byName(left.name, right.name));

  return {
    key: afterTable.key,
    beforeDefinition: summarizeTableDefinition(beforeTable),
    afterDefinition: summarizeTableDefinition(afterTable),
    addedColumns,
    removedColumns,
    changedColumns,
    addedKeys,
    removedKeys,
    changedKeys,
    addedIndexes,
    removedIndexes,
    changedIndexes,
    addedForeignKeys,
    removedForeignKeys,
    changedForeignKeys,
    changed:
      addedColumns.length > 0 ||
      removedColumns.length > 0 ||
      changedColumns.length > 0 ||
      addedKeys.length > 0 ||
      removedKeys.length > 0 ||
      changedKeys.length > 0 ||
      addedIndexes.length > 0 ||
      removedIndexes.length > 0 ||
      changedIndexes.length > 0 ||
      addedForeignKeys.length > 0 ||
      removedForeignKeys.length > 0 ||
      changedForeignKeys.length > 0,
  };
}

function summarizeTableDefinition(table) {
  return {
    key: table.key,
    columns: table.columns.map((column) => ({
      name: column.name,
      type: column.typeDefinition ?? column.dataType,
      nullable: column.isNullable,
    })),
    keys: (table.keys ?? []).map((key) => ({
      name: key.name,
      type: key.typeDescription ?? key.type,
      columns: (key.columns ?? []).map((column) => column.columnName).join(', '),
    })),
    indexes: (table.indexes ?? []).map((index) => ({
      name: index.name,
      type: index.typeDescription ?? index.type,
      columns: (index.columns ?? []).map((column) => column.columnName).join(', '),
    })),
    foreignKeys: (table.outgoingForeignKeys ?? []).map((foreignKey) => ({
      name: foreignKey.name,
      target: foreignKey.referencedTableKey,
      columns: (foreignKey.columns ?? [])
        .map((column) => `${column.sourceColumnName ?? column.parentColumnName} -> ${column.referencedColumnName}`)
        .join(', '),
    })),
  };
}

export function compareVersions(beforeVersion, afterVersion) {
  if (!beforeVersion || !afterVersion) {
    return null;
  }

  const beforeTables = asMap(beforeVersion.source.tables, (table) => table.key);
  const afterTables = asMap(afterVersion.source.tables, (table) => table.key);
  const addedTables = [...afterTables.keys()].filter((key) => !beforeTables.has(key)).sort(byName);
  const removedTables = [...beforeTables.keys()].filter((key) => !afterTables.has(key)).sort(byName);
  const changedTables = [...afterTables.values()]
    .map((afterTable) => {
      const beforeTable = beforeTables.get(afterTable.key);
      return beforeTable ? compareTables(beforeTable, afterTable) : null;
    })
    .filter((table) => table?.changed)
    .sort((left, right) => byName(left.key, right.key));
  const unchangedTables = [...afterTables.keys()]
    .filter((key) => beforeTables.has(key) && !changedTables.some((table) => table.key === key))
    .sort(byName);
  const objectChanges = {
    views: compareSchemaObjects(beforeVersion.source.views, afterVersion.source.views, 'view'),
    routines: compareSchemaObjects(beforeVersion.source.routines, afterVersion.source.routines, 'routine'),
    triggers: compareSchemaObjects(beforeVersion.source.triggers, afterVersion.source.triggers, 'trigger'),
  };
  const dependencyChanges = compareDependencies(beforeVersion.source.dependencies, afterVersion.source.dependencies);

  return {
    fromVersion: beforeVersion.version,
    toVersion: afterVersion.version,
    addedTables,
    removedTables,
    changedTables,
    unchangedTables,
    objectChanges,
    dependencyChanges,
  };
}
