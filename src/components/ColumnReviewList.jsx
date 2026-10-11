import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { getColumnReviewRows, columnReviewToCsv } from '../data/columnReview.js';
import { downloadText } from '../data/downloads.js';
import { ConfidenceBadge } from './ConfidenceBadge.jsx';

const pageSize = 50;

export function ColumnReviewList({ version, onSelectTable }) {
  const [status, setStatus] = useState('unknown');
  const [query, setQuery] = useState('');
  const [tableKey, setTableKey] = useState('');
  const [page, setPage] = useState(0);
  const rows = useMemo(() => getColumnReviewRows(version, { status, tableKey, query }), [version, status, tableKey, query]);
  const tables = useMemo(() => [...version.tables].sort((a, b) => a.id.localeCompare(b.id)), [version]);
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * pageSize;
  function change(setter, value) {
    setter(value);
    setPage(0);
  }

  return (
    <section className="health-section column-review-section" aria-labelledby="column-review-heading">
      <div className="section-title-row">
        <h3 id="column-review-heading">Columns needing review</h3>
        <span>{rows.length} matching columns</span>
      </div>
      <div className="table-tools-row column-review-filters">
        <label><span>Search columns</span><input aria-label="Search review columns" value={query} onChange={event => change(setQuery, event.target.value)} placeholder="Table, column, type, or purpose" /></label>
        <label><span>Table</span><select aria-label="Review table" value={tableKey} onChange={event => change(setTableKey, event.target.value)}>
          <option value="">All tables</option>
          {tables.map(table => <option key={table.id} value={table.id}>{table.id}</option>)}
        </select></label>
        <label><span>Status</span><select aria-label="Column review status" value={status} onChange={event => change(setStatus, event.target.value)}>
          <option value="unknown">Unknown</option><option value="inferred">Inferred</option><option value="observed">Observed</option><option value="confirmed">Confirmed</option><option value="deprecated">Deprecated</option><option value="do_not_rely_on">Do not rely</option><option value="">All statuses</option>
        </select></label>
        <button className="text-button" type="button" disabled={!rows.length} onClick={() => downloadText(`${version.source.productKey}-${version.version}-columns-review.csv`, columnReviewToCsv(rows), 'text/csv;charset=utf-8')}><Download size={16} aria-hidden="true" /> Export CSV</button>
      </div>
      {rows.length ? <div className="column-review-scroll"><table className="column-review-table">
        <thead><tr><th scope="col">Table</th><th scope="col">Column</th><th scope="col">Type</th><th scope="col">Purpose</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.slice(start, start + pageSize).map(row => <tr key={`${row.table}/${row.column}`}>
          <td><button className="text-button" type="button" onClick={() => onSelectTable(row.table)} aria-label={`Open table ${row.table} for column ${row.column}`}>{row.table}</button></td>
          <td><strong>{row.column}</strong></td><td><code>{row.dataType}</code></td><td>{row.purpose || 'Not documented'}</td><td><ConfidenceBadge value={row.confidence} /></td>
        </tr>)}</tbody>
      </table></div> : <p className="empty-state" role="status">No columns match these filters.</p>}
      <div className="column-review-pagination">
        <span aria-live="polite">{rows.length ? `${start + 1}-${Math.min(start + pageSize, rows.length)} of ${rows.length}` : '0 columns'}</span>
        <button type="button" className="icon-button" title="Previous columns page" aria-label="Previous columns page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>
        <button type="button" className="icon-button" title="Next columns page" aria-label="Next columns page" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button>
      </div>
    </section>
  );
}
