export function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function tableToCsv(table) {
  const rows = [
    ['column', 'type', 'nullable', 'confidence', 'purpose'],
    ...table.columns.map((column) => [
      column.name,
      column.dataType,
      column.nullable ? 'yes' : 'no',
      column.confidence,
      column.purpose,
    ]),
  ];
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

export function relationshipsToCsv(table, relationships) {
  const rows = [['table', 'direction', 'related_table', 'confidence', 'note']];
  relationships.forEach((relationship) => {
    rows.push([
      table.id,
      relationship.type,
      relationship.table,
      relationship.confidence,
      relationship.note,
    ]);
  });
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

export function comparisonToCsv(comparison) {
  const rows = [['category', 'table', 'column_or_object', 'change']];
  comparison.addedTables.forEach((table) => rows.push(['added_table', table, '', 'added']));
  comparison.removedTables.forEach((table) => rows.push(['removed_table', table, '', 'removed']));
  comparison.changedTables.forEach((table) => {
    for (const [property, category] of [['Keys', 'key'], ['Indexes', 'index'], ['ForeignKeys', 'foreign_key']]) {
      if (property === 'Keys') {
        (table.addedKeys ?? []).forEach((name) => rows.push(['added_key', table.key, name, 'added']));
        (table.removedKeys ?? []).forEach((name) => rows.push(['removed_key', table.key, name, 'removed']));
      }
      (table[`changed${property}`] ?? []).forEach((item) =>
        rows.push([`changed_${category}`, table.key, item.name, item.details.join('; ')]),
      );
    }
    table.addedColumns.forEach((column) => rows.push(['added_column', table.key, column, 'added']));
    table.removedColumns.forEach((column) => rows.push(['removed_column', table.key, column, 'removed']));
    table.changedColumns.forEach((column) =>
      rows.push(['changed_column', table.key, column.name, column.changes.join('; ')]),
    );
    table.addedIndexes.forEach((index) => rows.push(['added_index', table.key, index, 'added']));
    table.removedIndexes.forEach((index) => rows.push(['removed_index', table.key, index, 'removed']));
    table.addedForeignKeys.forEach((foreignKey) => rows.push(['added_foreign_key', table.key, foreignKey, 'added']));
    table.removedForeignKeys.forEach((foreignKey) =>
      rows.push(['removed_foreign_key', table.key, foreignKey, 'removed']),
    );
  });
  Object.entries(comparison.objectChanges ?? {}).forEach(([objectType, changes]) => {
    changes.added.forEach((objectKey) => rows.push([`added_${objectType}`, '', objectKey, 'added']));
    changes.removed.forEach((objectKey) => rows.push([`removed_${objectType}`, '', objectKey, 'removed']));
    changes.changed.forEach((object) =>
      rows.push([`changed_${objectType}`, '', object.key, object.details.join('; ')]),
    );
  });
  (comparison.dependencyChanges?.added ?? []).forEach((dependency) =>
    rows.push(['added_dependency', '', dependency, 'added']),
  );
  (comparison.dependencyChanges?.removed ?? []).forEach((dependency) =>
    rows.push(['removed_dependency', '', dependency, 'removed']),
  );
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

export function reviewTablesToCsv(tables) {
  const rows = [['table', 'confidence', 'has_manual_notes', 'columns', 'summary']];
  tables.forEach((table) => {
    rows.push([
      table.id,
      table.confidence,
      table.hasManualNotes ? 'yes' : 'no',
      table.columns.length,
      table.summary,
    ]);
  });
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}
