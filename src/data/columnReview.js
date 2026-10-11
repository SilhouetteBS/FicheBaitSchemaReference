import { csvEscape } from './csvExports.js';

export function getColumnReviewRows(version, { status = 'unknown', tableKey = '', query = '' } = {}) {
  const search = query.trim().toLowerCase();
  return version.tables.flatMap(table => {
    if (tableKey && table.id !== tableKey) return [];
    return table.columns.map(column => ({
      table: table.id,
      column: column.name,
      dataType: column.dataType,
      purpose: column.purpose ?? '',
      confidence: column.confidence ?? 'unknown',
    }));
  }).filter(row => (!status || row.confidence === status) && (!search ||
    [row.table, row.column, row.dataType, row.purpose].some(value => String(value).toLowerCase().includes(search))))
    .sort((a, b) => a.table.localeCompare(b.table) || a.column.localeCompare(b.column));
}

export function columnReviewToCsv(rows) {
  return [['table', 'column', 'type', 'confidence', 'purpose'], ...rows.map(row =>
    [row.table, row.column, row.dataType, row.confidence, row.purpose])]
    .map(row => row.map(csvEscape).join(',')).join('\n') + '\n';
}
