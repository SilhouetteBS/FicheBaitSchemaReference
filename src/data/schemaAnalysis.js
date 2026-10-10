function normalize(value) {
  return String(value ?? '').toLowerCase().trim();
}

function getObjectLabel(key) {
  return key?.replace(/^dbo\./, '') ?? '';
}

function addAlias(aliasMap, alias, key) {
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias || !key) {
    return;
  }

  const existingKey = aliasMap.get(normalizedAlias);
  aliasMap.set(normalizedAlias, aliasMap.has(normalizedAlias) && existingKey !== key ? null : key);
}

export function buildObjectAliasMap(version) {
  const aliases = new Map();
  [
    ...(version.source.tables ?? []).map((object) => ({ ...object, objectKey: object.key })),
    ...(version.source.views ?? []).map((object) => ({ ...object, objectKey: object.key })),
    ...(version.source.routines ?? []).map((object) => ({ ...object, objectKey: object.key })),
    ...(version.source.triggers ?? []).map((object) => ({ ...object, objectKey: object.name })),
  ].forEach((object) => {
    addAlias(aliases, object.objectKey, object.objectKey);
    addAlias(aliases, object.name, object.objectKey);
    addAlias(aliases, object.label, object.objectKey);
    addAlias(aliases, getObjectLabel(object.objectKey), object.objectKey);
    if (object.parentObjectKey && object.name && !object.name.includes('.')) {
      const schema = object.schemaName ?? object.parentObjectKey.slice(0, object.parentObjectKey.lastIndexOf('.'));
      addAlias(aliases, `${schema}.${object.name}`, object.objectKey);
    }
  });
  return aliases;
}

export function resolveDependencyKey(dependency, prefix, aliases) {
  const objectKey = dependency[`${prefix}ObjectKey`];
  const schemaName = dependency[`${prefix}SchemaName`];
  const entityName = dependency[`${prefix}EntityName`] ?? dependency[`${prefix}ObjectName`];
  // Explicit schema names must never fall back to another schema's bare name.
  if (schemaName && entityName) return aliases.get(normalize(`${schemaName}.${entityName}`)) ?? '';
  if (String(objectKey ?? '').includes('.')) return aliases.get(normalize(objectKey)) ?? '';
  const candidates = [
    objectKey,
    schemaName && entityName ? `${schemaName}.${entityName}` : '',
    entityName,
  ];

  for (const candidate of candidates) {
    const resolvedKey = aliases.get(normalize(candidate));
    if (resolvedKey) {
      return resolvedKey;
    }
  }

  return '';
}

export function classifyDependency(dependency) {
  const constraint = dependency.referencingObjectTypeDescription === 'CHECK_CONSTRAINT';
  const target = dependency.referencedEntityName ?? dependency.referencedObjectKey ?? '';
  const pseudoTable = dependency.referencingObjectTypeDescription === 'SQL_TRIGGER' &&
    !dependency.referencedSchemaName && /^(inserted|deleted)$/i.test(target);
  return { constraint, pseudoTable };
}

export function getColumnUsages(version, query) {
  const needle = normalize(query);
  if (!needle) {
    return [];
  }

  const results = [];
  version.tables.forEach((table) => {
    table.columns.forEach((column) => {
      if (normalize(`${column.name} ${column.dataType} ${column.purpose}`).includes(needle)) {
        const indexedBy = table.indexes
          .filter((index) => index.columns.some((indexedColumn) => indexedColumn.columnName === column.name))
          .map((index) => index.name);
        const foreignKeys = [
          ...(table.source.outgoingForeignKeys ?? []),
          ...(table.source.incomingForeignKeys ?? []),
        ].filter((foreignKey) =>
          foreignKey.columns.some(
            (foreignKeyColumn) =>
              foreignKeyColumn.sourceColumnName === column.name ||
              foreignKeyColumn.referencedColumnName === column.name,
          ),
        );

        results.push({
          tableKey: table.id,
          columnName: column.name,
          dataType: column.dataType,
          indexedBy,
          foreignKeys: foreignKeys.map((foreignKey) => foreignKey.name),
        });
      }
    });
  });

  return results.slice(0, 200);
}

export function getDependencyResolutionItems(version) {
  const aliases = buildObjectAliasMap(version);
  return (version.source.dependencies ?? []).map((dependency, index) => {
    const referencingResolvedKey = resolveDependencyKey(dependency, 'referencing', aliases);
    const referencedResolvedKey = resolveDependencyKey(dependency, 'referenced', aliases);
    const missingSides = [
      referencingResolvedKey ? '' : 'referencing',
      referencedResolvedKey ? '' : 'referenced',
    ].filter(Boolean);
    const classification = classifyDependency(dependency);
    const expectedNonObjectReference = Boolean(
      (classification.constraint && referencedResolvedKey && !referencingResolvedKey) ||
      (classification.pseudoTable && referencingResolvedKey && !referencedResolvedKey));

    return {
      index,
      id: `dependency:${index}`,
      referencingObjectKey: dependency.referencingObjectKey,
      referencedObjectKey: dependency.referencedObjectKey,
      referencingResolvedKey,
      referencedResolvedKey,
      referencingObjectTypeDescription: dependency.referencingObjectTypeDescription,
      referencedObjectTypeDescription: dependency.referencedObjectTypeDescription,
      referencedEntityName: dependency.referencedEntityName,
      expectedNonObjectReference,
      isAmbiguous: Boolean(dependency.isAmbiguous),
      isCallerDependent: Boolean(dependency.isCallerDependent),
      isSchemaBoundReference: Boolean(dependency.isSchemaBoundReference),
      status: expectedNonObjectReference ? 'Expected non-object reference' : missingSides.length === 0
        ? 'Resolved'
        : missingSides.length === 2
          ? 'Referencing and referenced objects were not exported'
          : missingSides[0] === 'referencing'
            ? 'Referencing object was not exported'
            : 'Referenced object was not exported',
      likelyReason: getDependencyLikelyReason(dependency, missingSides),
      suggestedFix: getDependencySuggestedFix(dependency, missingSides),
    };
  });
}

function getDependencyLikelyReason(dependency, missingSides) {
  if (missingSides.length === 0) {
    return 'Resolved to exported schema objects.';
  }
  const classification = classifyDependency(dependency);
  if (classification.pseudoTable) return 'Trigger references inserted/deleted, SQL Server pseudo-tables rather than exported application tables.';
  if (classification.constraint && missingSides.includes('referencing')) return 'The referencing object is a check constraint, which is not included in the exported table/view/routine/trigger object sets.';
  if (dependency.isCallerDependent) {
    return 'SQL Server marked the dependency as caller-dependent, so the exact target may only be known at runtime.';
  }
  if (dependency.isAmbiguous) {
    return 'SQL Server marked the reference as ambiguous, often because the name could resolve to more than one object.';
  }
  if (!dependency.referencedSchemaName && dependency.referencedEntityName) {
    return 'The dependency row does not include referenced schema metadata, which commonly happens with aliases, helper objects, or pseudo tables.';
  }
  if (missingSides.includes('referencing')) {
    return 'The object that SQL Server reported as the referencing object was not part of the exported object sets.';
  }
  return 'The referenced object was not found in exported tables, views, routines, or triggers.';
}

function getDependencySuggestedFix(dependency, missingSides) {
  if (missingSides.length === 0) {
    return 'No action needed.';
  }
  const classification = classifyDependency(dependency);
  if (classification.pseudoTable) return 'No application table is missing for this pseudo-table reference. Review the trigger definition for its behavior.';
  if (classification.constraint && missingSides.length === 1 && missingSides[0] === 'referencing') return 'No re-export is required solely because check constraints are outside the exported object sets.';
  if (dependency.isCallerDependent || dependency.isAmbiguous) {
    return 'Treat this as a diagram completeness warning. Review the SQL definition manually if the object is important for reporting.';
  }
  if (!dependency.referencedSchemaName && dependency.referencedEntityName) {
    return 'Check whether the name is an alias, pseudo table, or product helper object before adding manual notes.';
  }
  return 'Confirm all expected export files were included. If they were, document the unresolved row as expected SQL Server metadata noise.';
}

export function getUnresolvedDependencyItems(version) {
  return getDependencyResolutionItems(version)
    .filter((item) => !item.expectedNonObjectReference && (!item.referencingResolvedKey || !item.referencedResolvedKey))
    .sort((left, right) =>
      left.status.localeCompare(right.status) ||
      String(left.referencingObjectKey).localeCompare(String(right.referencingObjectKey)) ||
      String(left.referencedObjectKey).localeCompare(String(right.referencedObjectKey)),
    );
}

export function getReviewItems(version) {
  return version.tables
    .filter((table) => table.confidence === 'unknown' || table.confidence === 'inferred')
    .map((table) => {
      const relationshipCount = table.relationships.length;
      const columnsNeedingReview = table.columns.filter((column) => column.confidence === 'unknown').length;
      const score =
        relationshipCount * 4 +
        table.indexes.length +
        table.triggers.length * 3 +
        columnsNeedingReview * 0.5 +
        (table.confidence === 'unknown' ? 8 : 4) +
        (table.hasManualNotes ? 0 : 6);
      return {
        key: table.id,
        confidence: table.confidence,
        hasManualNotes: table.hasManualNotes,
        columnsNeedingReview,
        relationshipCount,
        indexCount: table.indexes.length,
        triggerCount: table.triggers.length,
        score: Number(score.toFixed(1)),
        reason: relationshipCount > 0
          ? `${relationshipCount} relationships make this table useful for join-path documentation.`
          : 'Low relationship density, but table purpose and columns still need review.',
      };
    })
    .sort((left, right) => {
      if (left.hasManualNotes !== right.hasManualNotes) {
        return left.hasManualNotes ? 1 : -1;
      }
      return right.score - left.score || right.columnsNeedingReview - left.columnsNeedingReview;
    });
}

export function getTableImpactItems(version) {
  const dependencyCounts = new Map();
  (version.source.dependencies ?? []).forEach((dependency) => {
    [dependency.referencingObjectKey, dependency.referencedObjectKey].forEach((key) => {
      if (key) {
        dependencyCounts.set(key, (dependencyCounts.get(key) ?? 0) + 1);
      }
    });
  });

  return version.tables
    .map((table) => {
      const relationshipCount = table.relationships.length;
      const dependencyCount = dependencyCounts.get(table.id) ?? 0;
      const indexCount = table.indexes.length;
      const triggerCount = table.triggers.length;
      const unknownColumns = table.columns.filter((column) => column.confidence === 'unknown').length;
      const score =
        relationshipCount * 3 +
        dependencyCount * 2 +
        indexCount +
        triggerCount * 4 +
        unknownColumns * 0.25 +
        (table.hasManualNotes ? 0 : 8);

      return {
        key: table.id,
        confidence: table.confidence,
        hasManualNotes: table.hasManualNotes,
        relationshipCount,
        dependencyCount,
        indexCount,
        triggerCount,
        unknownColumns,
        score: Number(score.toFixed(2)),
      };
    })
    .sort((left, right) => right.score - left.score || left.key.localeCompare(right.key));
}

export function getSchemaHealthItems(version) {
  return version.tables
    .map((table) => {
      const primaryKeys = table.keys.filter((key) => key.type === 'PK');
      const untrustedForeignKeys = [
        ...(table.source.outgoingForeignKeys ?? []),
        ...(table.source.incomingForeignKeys ?? []),
      ].filter((foreignKey) => foreignKey.isNotTrusted || foreignKey.isDisabled);
      const computedColumns = table.columns.filter((column) => column.source.isComputed);
      const identityColumns = table.columns.filter((column) => column.source.isIdentity);
      const riskFlags = [
        /audit|history|log|snapshot|security|user|role|group|license|identity/i.test(table.id)
          ? 'sensitive or historical table'
          : '',
        table.triggers.length > 0 ? 'triggered table' : '',
        primaryKeys.length === 0 ? 'no exported primary key' : '',
        untrustedForeignKeys.length > 0 ? 'disabled or untrusted foreign key' : '',
        computedColumns.length > 0 ? 'computed columns' : '',
      ].filter(Boolean);

      return {
        key: table.id,
        riskFlags,
        primaryKeyCount: primaryKeys.length,
        untrustedForeignKeyCount: untrustedForeignKeys.length,
        triggerCount: table.triggers.length,
        computedColumnCount: computedColumns.length,
        identityColumnCount: identityColumns.length,
      };
    })
    .filter((item) => item.riskFlags.length > 0)
    .sort((left, right) => right.riskFlags.length - left.riskFlags.length || left.key.localeCompare(right.key));
}
