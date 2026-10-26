import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyTextToClipboard } from '../data/clipboard.js';
import { getObjectChangeCounts, filterComparisonObjectChanges } from '../data/schemaDictionary.js';
import {
  getComparisonSeverityCounts,
  getTableChangeSeverity,
  getVersionChangeSummary,
  isBreakingTableChange,
} from '../data/projectInsights.js';

export function ComparisonSummary({
  comparison,
  versions,
  fromVersion,
  toVersion,
  onFromVersionChange,
  onToVersionChange,
  onOpen,
  onDownloadJson,
  onDownloadCsv,
}) {
  if (!comparison) {
    return null;
  }
  const unchangedCount = comparison.unchangedTables?.length ?? 0;
  const changeSummary = getVersionChangeSummary(comparison);
  const severityCounts = getComparisonSeverityCounts(comparison);

  return (
    <section className="comparison-panel" aria-label="Version comparison summary">
      <div className="comparison-panel-header">
        <div>
          <h2>Version comparison</h2>
        </div>
        <div className="comparison-actions">
          <button type="button" onClick={onOpen}>
            Open
          </button>
          <button type="button" onClick={onDownloadJson}>
            JSON
          </button>
          <button type="button" onClick={onDownloadCsv}>
            CSV
          </button>
        </div>
      </div>
      <div className="comparison-panel-body">
        <VersionComparePicker
          versions={versions}
          fromVersion={fromVersion}
          toVersion={toVersion}
          onFromVersionChange={onFromVersionChange}
          onToVersionChange={onToVersionChange}
        />
        <div className="comparison-metrics" aria-label="Comparison counts">
          {[
            ['added', 'Added', comparison.addedTables.length],
            ['removed', 'Removed', comparison.removedTables.length],
            ['changed', 'Changed', comparison.changedTables.length],
            ['unchanged', 'Unchanged', unchangedCount],
          ].map(([status, label, value]) => (
            <span className={`change-status-${status}`} key={label}>
              <strong>{value}</strong>
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="comparison-narrative" aria-label="What changed in this version">
        <strong>What changed</strong>
        <ul>
          {changeSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="comparison-severity-strip" aria-label="Changed table severity">
        <span className="severity-high"><strong>{severityCounts.high}</strong> high risk</span>
        <span className="severity-medium"><strong>{severityCounts.medium}</strong> medium risk</span>
        <span className="severity-low"><strong>{severityCounts.low}</strong> low risk</span>
      </div>
    </section>
  );
}

function VersionComparePicker({
  versions,
  fromVersion,
  toVersion,
  onFromVersionChange,
  onToVersionChange,
}) {
  return (
    <div className="compare-picker">
      <label>
        <span>From</span>
        <select value={fromVersion} onChange={(event) => onFromVersionChange(event.target.value)}>
          {versions.map((version) => (
            <option value={version.version} key={version.version}>
              {version.version}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>To</span>
        <select value={toVersion} onChange={(event) => onToVersionChange(event.target.value)}>
          {versions.map((version) => (
            <option value={version.version} key={version.version}>
              {version.version}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ComparisonDetail({
  comparison,
  onSelectTable,
  selectedTableKey,
  onSelectedTableKeyChange,
}) {
  const [changeFilter, setChangeFilter] = useState('all');
  const [showBreakingOnly, setShowBreakingOnly] = useState(false);
  const [columnDetailFilter, setColumnDetailFilter] = useState('all');
  if (!comparison) {
    return null;
  }
  const selectedChange =
    comparison.changedTables.find((table) => table.key === selectedTableKey) ?? comparison.changedTables[0];
  const changeFilterCounts = {
    all: comparison.changedTables.length,
    columns: comparison.changedTables.filter((table) =>
      table.addedColumns.length + table.removedColumns.length + table.changedColumns.length > 0).length,
    keys: comparison.changedTables.filter((table) =>
      table.addedKeys.length + table.removedKeys.length + table.changedKeys.length > 0).length,
    indexes: comparison.changedTables.filter((table) =>
      table.addedIndexes.length + table.removedIndexes.length + table.changedIndexes.length > 0).length,
    relationships: comparison.changedTables.filter((table) =>
      table.addedForeignKeys.length + table.removedForeignKeys.length + table.changedForeignKeys.length > 0).length,
  };
  const filteredChangedTables = comparison.changedTables.filter((table) => {
    if (showBreakingOnly && !isBreakingTableChange(table)) {
      return false;
    }
    if (changeFilter === 'all') {
      return true;
    }
    if (changeFilter === 'columns') {
      return table.addedColumns.length + table.removedColumns.length + table.changedColumns.length > 0;
    }
    if (changeFilter === 'keys') {
      return table.addedKeys.length + table.removedKeys.length + table.changedKeys.length > 0;
    }
    if (changeFilter === 'indexes') {
      return table.addedIndexes.length + table.removedIndexes.length + table.changedIndexes.length > 0;
    }
    if (changeFilter === 'relationships') {
      return table.addedForeignKeys.length + table.removedForeignKeys.length + table.changedForeignKeys.length > 0;
    }
    return true;
  });
  const filteredChangedColumns = selectedChange?.changedColumns.filter((column) => {
    if (columnDetailFilter === 'all') {
      return true;
    }
    return column.changes.includes(columnDetailFilter);
  }) ?? [];
  const showAddedColumns = columnDetailFilter === 'all' || columnDetailFilter === 'added';
  const showRemovedColumns = columnDetailFilter === 'all' || columnDetailFilter === 'removed';
  const showKeyIndexChanges = columnDetailFilter === 'all' || columnDetailFilter === 'key_index';
  const showRelationshipChanges = columnDetailFilter === 'all' || columnDetailFilter === 'relationships';
  return (
    <section className="detail-surface">
      <div className="detail-heading">
        <div>
          <h2>Schema changes</h2>
          <p>Browse table, column, index, and relationship-level changes between snapshots.</p>
        </div>
      </div>
      {comparison.fromVersion === comparison.toVersion && (
        <p className="inline-warning">Select two different versions to compare schema changes.</p>
      )}
      <div className="diff-grid">
        <DiffList title="Added tables" status="added" items={comparison.addedTables} onSelect={onSelectTable} />
        <DiffList title="Removed tables" status="removed" items={comparison.removedTables} />
      </div>
      <section className="diff-section">
        <div className="section-title-row">
          <h3>Changed tables</h3>
          <span>{filteredChangedTables.length}</span>
        </div>
        <div className="comparison-filter-row" aria-label="Change filters">
          {[
            ['all', 'All'],
            ['columns', 'Columns'],
            ['keys', 'Keys'],
            ['indexes', 'Indexes'],
            ['relationships', 'Relationships'],
          ].map(([value, label]) => (
            <button
              className={changeFilter === value ? 'selected' : ''}
              key={value}
              onClick={() => setChangeFilter(value)}
              type="button"
            >
              {label}
              <span>{changeFilterCounts[value]}</span>
            </button>
          ))}
          <label className="comparison-filter-toggle">
            <input
              checked={showBreakingOnly}
              onChange={(event) => setShowBreakingOnly(event.target.checked)}
              type="checkbox"
            />
            Breaking only
          </label>
        </div>
        <div className="changed-table-list">
          {filteredChangedTables.map((table) => (
            <article className="changed-table-item" key={table.key}>
              <div className="changed-table-heading">
                <button type="button" onClick={() => onSelectTable(table.key)}>
                  {table.key}
                </button>
                <span
                  className={`severity-badge severity-${getTableChangeSeverity(table).level}`}
                  title={getTableChangeSeverity(table).reason}
                >
                  {getTableChangeSeverity(table).label}
                </span>
                <button
                  className="change-detail-button"
                  type="button"
                  onClick={() => onSelectedTableKeyChange(table.key)}
                >
                  Details
                </button>
              </div>
              <div className="change-tags">
                <span className="change-status-added">+{table.addedColumns.length} columns</span>
                <span className="change-status-removed">-{table.removedColumns.length} columns</span>
                <span className="change-status-changed">{table.changedColumns.length} changed columns</span>
                <span className="change-status-added">+{table.addedKeys.length} keys</span>
                <span className="change-status-removed">-{table.removedKeys.length} keys</span>
                <span className="change-status-changed">{table.changedKeys.length} changed keys</span>
                <span className="change-status-added">+{table.addedIndexes.length} indexes</span>
                <span className="change-status-removed">-{table.removedIndexes.length} indexes</span>
                <span className="change-status-changed">{table.changedIndexes.length} changed indexes</span>
                <span className="change-status-added">+{table.addedForeignKeys.length} FKs</span>
                <span className="change-status-removed">-{table.removedForeignKeys.length} FKs</span>
                <span className="change-status-changed">{table.changedForeignKeys.length} changed FKs</span>
              </div>
              {table.changedColumns.length > 0 && (
                <p>
                  {table.changedColumns
                    .slice(0, 4)
                    .map((column) => `${column.name} (${column.changes.join(', ')})`)
                    .join('; ')}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
      <ObjectChanges key={`${comparison.fromVersion}/${comparison.toVersion}`} comparison={comparison} />
      {selectedChange && (
        <section className="comparison-drilldown">
          <div className="section-title-row">
            <h3>Change details</h3>
            <button className="text-button" type="button" onClick={() => onSelectTable(selectedChange.key)}>
              Open table
            </button>
          </div>
          <h4>{selectedChange.key}</h4>
          <div className="comparison-filter-row comparison-filter-row-compact" aria-label="Changed column detail filters">
            {[
              ['all', 'All columns', selectedChange.addedColumns.length + selectedChange.removedColumns.length + selectedChange.changedColumns.length],
              ['added', 'Added', selectedChange.addedColumns.length],
              ['removed', 'Removed', selectedChange.removedColumns.length],
              ['type', 'Type changed', selectedChange.changedColumns.filter((column) => column.changes.includes('type')).length],
              ['nullability', 'Nullability', selectedChange.changedColumns.filter((column) => column.changes.includes('nullability')).length],
              [
                'key_index',
                'Keys/indexes',
                selectedChange.addedKeys.length +
                  selectedChange.removedKeys.length +
                  selectedChange.changedKeys.length +
                  selectedChange.addedIndexes.length +
                  selectedChange.removedIndexes.length +
                  selectedChange.changedIndexes.length,
              ],
              [
                'relationships',
                'Relationships',
                selectedChange.addedForeignKeys.length +
                  selectedChange.removedForeignKeys.length +
                  selectedChange.changedForeignKeys.length,
              ],
            ].map(([value, label, count]) => (
              <button
                className={columnDetailFilter === value ? 'selected' : ''}
                key={value}
                onClick={() => setColumnDetailFilter(value)}
                type="button"
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="drilldown-grid">
            {showAddedColumns && <ChangeBucket title="Added columns" items={selectedChange.addedColumns} />}
            {showRemovedColumns && <ChangeBucket title="Removed columns" items={selectedChange.removedColumns} />}
            {columnDetailFilter !== 'added' &&
              columnDetailFilter !== 'removed' &&
              columnDetailFilter !== 'key_index' &&
              columnDetailFilter !== 'relationships' && (
              <ChangeBucket
                title="Changed columns"
                items={filteredChangedColumns.map((column) => `${column.name}: ${column.details.join('; ')}`)}
              />
            )}
            {showKeyIndexChanges && <ChangeBucket title="Added keys" items={selectedChange.addedKeys} />}
            {showKeyIndexChanges && <ChangeBucket title="Removed keys" items={selectedChange.removedKeys} />}
            {showKeyIndexChanges && (
              <ChangeBucket
                title="Changed keys"
                items={selectedChange.changedKeys.map((key) => `${key.name}: ${key.details.join('; ')}`)}
              />
            )}
            {showKeyIndexChanges && <ChangeBucket title="Added indexes" items={selectedChange.addedIndexes} />}
            {showKeyIndexChanges && <ChangeBucket title="Removed indexes" items={selectedChange.removedIndexes} />}
            {showKeyIndexChanges && (
              <ChangeBucket
                title="Changed indexes"
                items={selectedChange.changedIndexes.map((index) => `${index.name}: ${index.details.join('; ')}`)}
              />
            )}
            {showRelationshipChanges && <ChangeBucket title="Added foreign keys" items={selectedChange.addedForeignKeys} />}
            {showRelationshipChanges && <ChangeBucket title="Removed foreign keys" items={selectedChange.removedForeignKeys} />}
            {showRelationshipChanges && (
              <ChangeBucket
                title="Changed foreign keys"
                items={selectedChange.changedForeignKeys.map((foreignKey) =>
                  `${foreignKey.name}: ${foreignKey.details.join('; ')}`)}
              />
            )}
          </div>
          <TableDefinitionCompare selectedChange={selectedChange} />
        </section>
      )}
    </section>
  );
}

function ObjectChanges({ comparison }) {
  const [filter, setFilter] = useState('structural');
  const counts = getObjectChangeCounts(comparison);
  if (!counts.all) return null;
  const filtered = filterComparisonObjectChanges(comparison, filter);
  return <section className="diff-section object-comparison-section" aria-labelledby="object-changes-heading">
    <div className="section-title-row"><h3 id="object-changes-heading">Object and dependency changes</h3><span>{counts[filter]} of {counts.all}</span></div>
    <div className="comparison-filter-row" role="group" aria-label="Object change filters">
      {[['all', 'All changes'], ['structural', 'Structural changes'], ['definitionOnly', 'Definition-only changes']].map(([value, label]) =>
        <button type="button" key={value} className={filter === value ? 'selected' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{counts[value]}</span></button>)}
    </div>
    {counts[filter] === 0 && <p className="empty-state">No {filter === 'structural' ? 'structural' : 'definition-only'} object or dependency changes. Other changes remain available in the filters above.</p>}
    {[['views', 'Views'], ['routines', 'Routines'], ['triggers', 'Triggers']].map(([key, label]) => {
      const changes = filtered.objectChanges[key];
      return changes && changes.added.length + changes.removed.length + changes.changed.length > 0
        ? <ObjectChangeBucket group={{ key, label, changes }} key={key} comparison={comparison} /> : null;
    })}
    {(filtered.dependencyChanges.added.length + filtered.dependencyChanges.removed.length > 0) && <div className="drilldown-grid">
      <ChangeBucket title="Added dependencies" items={filtered.dependencyChanges.added} />
      <ChangeBucket title="Removed dependencies" items={filtered.dependencyChanges.removed} />
    </div>}
  </section>;
}

function ObjectChangeBucket({ group, comparison }) {
  return (
    <section className="object-change-bucket" aria-label={`${group.label} changes`}>
      <div className="section-title-row">
        <h3>{group.label}</h3>
        <span>
          {group.changes.added.length + group.changes.removed.length + group.changes.changed.length}
        </span>
      </div>
      <div className="object-change-grid">
        {group.changes.added.length > 0 && <ChangeList title="Added" status="added" items={group.changes.added} />}
        {group.changes.removed.length > 0 && <ChangeList title="Removed" status="removed" items={group.changes.removed} />}
        {group.changes.changed.length > 0 && <div className="object-change-table-scroll"><table className="object-change-table">
          <thead><tr><th scope="col">Object</th><th scope="col">Change</th><th scope="col">Impact</th></tr></thead>
          <tbody>{group.changes.changed.map(object => <tr key={object.key} data-object-key={object.key} className={object.changeCategory === 'definitionOnly' ? 'definition-only-change' : 'structural-object-change'}>
            <td><code>{object.key}</code></td>
            <td>
              {object.structuralDetails.length > 0 && <ul>{object.structuralDetails.map(detail => <li key={detail}>{detail}</li>)}</ul>}
              {object.definitionChange && <DefinitionChange object={object} comparison={comparison} />}
            </td>
            <td>{object.changeCategory === 'definitionOnly' ? 'Functional impact not established' : 'Review affected queries'}
              {object.changeCategory === 'structural' && object.definitionChange && <small>Definition impact not established</small>}
            </td>
          </tr>)}</tbody>
        </table></div>}
      </div>
    </section>
  );
}

function DefinitionChange({ object, comparison }) {
  const [copyStatus, setCopyStatus] = useState('');
  const change = object.definitionChange;
  async function copyHash(side, hash) {
    try { await copyTextToClipboard(hash); setCopyStatus(`${side} fingerprint copied`); }
    catch { setCopyStatus('Copy failed'); }
  }
  return <div className="definition-change-summary">
    <span>{change.kind === 'textChanged' ? 'Definition text changed' : 'Definition metadata availability changed'}</span>
    <details className="definition-technical-details">
      <summary aria-label={`Technical details for ${object.key}`}>Technical details</summary>
      <p>{change.kind === 'textChanged'
        ? 'The exported SQL text differs. Logic, comments, or formatting may have changed; this alone does not establish a functional or breaking change.'
        : 'A definition fingerprint is missing from one export. A SQL text change cannot be established from these exports.'}</p>
      <dl>{[['Before', change.beforeHash, comparison.fromVersion], ['After', change.afterHash, comparison.toVersion]].map(([side, hash, version]) => <div key={side}>
        <dt>{side} ({version}) SHA-256</dt><dd><code>{hash || 'Not exported'}</code>
          <button type="button" className="icon-button" title={`Copy ${side.toLowerCase()} fingerprint`} aria-label={`Copy ${side.toLowerCase()} fingerprint for ${object.key}`} disabled={!hash} onClick={() => copyHash(side, hash)}>
            {copyStatus === `${side} fingerprint copied` ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          </button>
        </dd>
      </div>)}</dl>
      <p>SQL definition text is not included in these exports; a SQL diff is unavailable.</p>
      <span role="status" aria-live="polite">{copyStatus}</span>
    </details>
  </div>;
}

function getColumnChangeStatus(selectedChange, columnName, side) {
  if (side === 'before' && selectedChange.removedColumns.includes(columnName)) {
    return 'removed';
  }
  if (side === 'after' && selectedChange.addedColumns.includes(columnName)) {
    return 'added';
  }
  const changedColumn = selectedChange.changedColumns.find((column) => column.name === columnName);
  return changedColumn ? 'changed' : '';
}

function getColumnChangeDetails(selectedChange, columnName) {
  const changedColumn = selectedChange.changedColumns.find((column) => column.name === columnName);
  if (selectedChange.addedColumns.includes(columnName)) {
    return 'Added column';
  }
  if (selectedChange.removedColumns.includes(columnName)) {
    return 'Removed column';
  }
  return changedColumn?.details.join('; ') ?? '';
}

function TableDefinitionCompare({ selectedChange }) {
  return (
    <section className="table-definition-compare" aria-label="Side-by-side table definition comparison">
      <div className="section-title-row">
        <h3>Table definition comparison</h3>
        <span>{selectedChange.beforeDefinition.columns.length} {'->'} {selectedChange.afterDefinition.columns.length} columns</span>
      </div>
      <div className="definition-compare-grid">
        <DefinitionSnapshot side="before" title="Before" definition={selectedChange.beforeDefinition} selectedChange={selectedChange} />
        <DefinitionSnapshot side="after" title="After" definition={selectedChange.afterDefinition} selectedChange={selectedChange} />
      </div>
    </section>
  );
}

function DefinitionSnapshot({ title, definition, selectedChange, side }) {
  return (
    <div className="definition-snapshot">
      <strong>{title}</strong>
      <dl>
        <div><dt>Columns</dt><dd>{definition.columns.length}</dd></div>
        <div><dt>Keys</dt><dd>{definition.keys.length}</dd></div>
        <div><dt>Indexes</dt><dd>{definition.indexes.length}</dd></div>
        <div><dt>Foreign keys</dt><dd>{definition.foreignKeys.length}</dd></div>
      </dl>
      {/* The constrained list must be focusable so keyboard users can scroll it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="definition-column-list" role="region" tabIndex={0} aria-label={`${title} column definitions`}>
        {definition.columns.map((column) => {
          const status = getColumnChangeStatus(selectedChange, column.name, side);
          const details = getColumnChangeDetails(selectedChange, column.name);
          return (
          <span className={status ? `definition-column-${status}` : ''} key={column.name} title={details}>
            <code>{column.name}</code>
            <em>
              {column.type}{column.nullable ? ' null' : ' not null'}
              {status && <b>{status}</b>}
            </em>
          </span>
          );
        })}
      </div>
    </div>
  );
}

function ChangeList({ title, status, items }) {
  return (
    <div className={`object-change-list object-change-list-${status}`}>
      <strong>{title}</strong>
      {items.length === 0 ? (
        <p className="empty-state">No changes.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getChangeStatus(title) {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes('added')) {
    return 'added';
  }
  if (normalizedTitle.includes('removed')) {
    return 'removed';
  }
  if (normalizedTitle.includes('changed')) {
    return 'changed';
  }
  return 'unchanged';
}

function ChangeBucket({ title, items }) {
  const status = getChangeStatus(title);
  return (
    <div className={`change-bucket change-bucket-${status}`}>
      <div className="section-title-row">
        <h3>{title}</h3>
        <span className={`change-status-${status}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="empty-state">No changes.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DiffList({ title, status, items, onSelect }) {
  return (
    <section className={`diff-list diff-list-${status}`}>
      <div className="section-title-row">
        <h3>{title}</h3>
        <span className={`change-status-${status}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="empty-state">No entries.</p>
      ) : (
        <div>
          {items.map((item) =>
            onSelect ? (
              <button type="button" key={item} onClick={() => onSelect(item)}>
                {item}
              </button>
            ) : (
              <span key={item}>{item}</span>
            ),
          )}
        </div>
      )}
    </section>
  );
}
