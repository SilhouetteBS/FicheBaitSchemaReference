import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileSearch,
  GitBranch,
  Search,
  Star,
  X,
} from 'lucide-react';
import { appConfig } from '../config.js';
import {
  getColumnLifecycleItems,
  getRelatedObjectItems,
  getTableStability,
  getTableVersionTrend,
} from '../data/projectInsights.js';
import { getReportingScriptsForTable, loadReportingScriptsForTable } from '../data/reporting.js';
import { ConfidenceBadge } from './ConfidenceBadge.jsx';

const ManualNotesEditor = appConfig.editingEnabled
  ? lazy(() => import('./ManualNotesEditor.jsx').then((module) => ({ default: module.ManualNotesEditor })))
  : null;

function getReviewAgeWarning(table) {
  if (!table.lastReviewedAt) {
    return table.hasManualNotes ? 'Manual notes have not been assigned a last-reviewed date.' : '';
  }
  const reviewedAt = new Date(table.lastReviewedAt);
  if (Number.isNaN(reviewedAt.getTime())) {
    return 'Manual notes have an invalid last-reviewed date.';
  }
  const ageDays = Math.floor((Date.now() - reviewedAt.getTime()) / 86400000);
  return ageDays > 365 ? `Manual notes were last reviewed ${ageDays.toLocaleString()} days ago.` : '';
}

export function TableWorkspace({
  documentationCoverage,
  selectedTable,
  version,
  favoriteObjects,
  filteredTables,
  editingEnabled,
  localNote,
  localNotesKey,
  localNoteChanged,
  query,
  tableConfidenceFilter,
  tableNotesFilter,
  onExportLocalNotes,
  onExportVersionNotes,
  onImportLocalNotes,
  onSaveLocalNote,
  onClearLocalNote,
  onClearTableSearch,
  onDownloadTableJson,
  onDownloadTableCsv,
  onDownloadTableMarkdown,
  onDownloadRelationshipsCsv,
  onDownloadUnknownTablesCsv,
  onQueryChange,
  onSelectTable,
  onSetTableConfidenceFilter,
  onSetTableNotesFilter,
  onToggleFavoriteObject,
  onOpenReportingScript,
  visibleRelationships,
  relationshipFilter,
  setRelationshipFilter,
  navigateToTable,
}) {
  const [activeTableTab, setActiveTableTab] = useState('columns');
  const [columnQuery, setColumnQuery] = useState('');
  const [tableDensity, setTableDensity] = useState('comfortable');
  const [activeContextPanel, setActiveContextPanel] = useState('');
  const reviewAgeWarning = getReviewAgeWarning(selectedTable);
  const relatedObjects = useMemo(() => getRelatedObjectItems(version, selectedTable.id), [selectedTable.id, version]);
  const tableStability = useMemo(() => getTableStability(version, selectedTable.id), [selectedTable.id, version]);
  const tableVersionTrend = useMemo(() => getTableVersionTrend(version, selectedTable.id), [selectedTable.id, version]);
  const [tableReportingScripts, setTableReportingScripts] = useState(() =>
    getReportingScriptsForTable(version.source.productKey, selectedTable.id));
  useEffect(() => {
    let canceled = false;
    setTableReportingScripts(getReportingScriptsForTable(version.source.productKey, selectedTable.id));
    loadReportingScriptsForTable(version.source.productKey, selectedTable.id).then((scripts) => {
      if (!canceled) {
        setTableReportingScripts(scripts);
      }
    }).catch(() => {
      // Curated scripts remain available when generated candidates cannot be loaded.
    });
    return () => {
      canceled = true;
    };
  }, [selectedTable.id, version.source.productKey]);
  const columnLifecycleItems = useMemo(
    () => getColumnLifecycleItems(version, selectedTable.id),
    [selectedTable.id, version],
  );
  const columnLifecycleByName = useMemo(
    () => new Map(columnLifecycleItems.map((column) => [column.name, column])),
    [columnLifecycleItems],
  );
  const primaryKeyColumns = useMemo(
    () => new Set(selectedTable.keys.filter((key) => key.type === 'PK').flatMap((key) => key.columns.map((column) => column.columnName))),
    [selectedTable],
  );
  const indexedColumns = useMemo(
    () => new Set(selectedTable.indexes.flatMap((index) => index.columns.map((column) => column.columnName))),
    [selectedTable],
  );
  const foreignKeyColumns = useMemo(
    () => new Set((selectedTable.source?.outgoingForeignKeys ?? []).flatMap((foreignKey) =>
      foreignKey.columns.map((column) => column.sourceColumnName ?? column.parentColumnName),
    )),
    [selectedTable],
  );
  const filteredColumns = useMemo(() => {
    const needle = columnQuery.toLowerCase().trim();
    if (!needle) {
      return selectedTable.columns;
    }
    return selectedTable.columns.filter((column) =>
      `${column.name} ${column.dataType} ${column.purpose}`.toLowerCase().includes(needle),
    );
  }, [columnQuery, selectedTable.columns]);
  const visibleColumns = filteredColumns.slice(0, 160);
  const hiddenColumnCount = Math.max(0, filteredColumns.length - visibleColumns.length);
  const tabCounts = {
    columns: selectedTable.columns.length,
    keys: selectedTable.keys.length,
    indexes: selectedTable.indexes.length,
    relationships: visibleRelationships.length,
    scripts: tableReportingScripts.length,
    notes: selectedTable.hasManualNotes || editingEnabled ? 1 : 0,
  };

  return (
    <div className="content-grid table-content-grid">
      <aside className="table-browser-panel" aria-label="Table browser">
        <div className="section-title-row">
          <h2>Tables</h2>
          <span>{filteredTables.length}</span>
        </div>
        <div className="table-browser-search search-box">
          <Search size={17} />
          <input
            aria-label="Search tables, columns, descriptions"
            placeholder="Search tables, columns, relationships, indexes"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && (
            <button aria-label="Clear table search" onClick={onClearTableSearch} type="button">
              <X size={15} />
            </button>
          )}
        </div>
        {favoriteObjects.length > 0 && (
          <div className="favorite-object-list" aria-label="Pinned objects">
            {favoriteObjects.map((objectKey) => (
              <button key={objectKey} type="button" onClick={() => onSelectTable(objectKey)}>
                <Star size={12} />
                {objectKey}
              </button>
            ))}
          </div>
        )}
        <div className="documentation-coverage" aria-label="Documentation coverage">
          <span><strong>{documentationCoverage.unknown}</strong> unknown</span>
          <span><strong>{documentationCoverage.manual}</strong> noted</span>
          <span><strong>{documentationCoverage.confirmed + documentationCoverage.observed}</strong> verified</span>
        </div>
        <div className="table-browser-filters">
          <label>
            <span>Confidence</span>
            <select value={tableConfidenceFilter} onChange={(event) => onSetTableConfidenceFilter(event.target.value)}>
              <option value="all">All confidence</option>
              <option value="unknown">Unknown only</option>
              <option value="inferred">Inferred</option>
              <option value="observed">Observed</option>
              <option value="confirmed">Confirmed</option>
              <option value="deprecated">Deprecated</option>
              <option value="do_not_rely_on">Do not rely</option>
            </select>
          </label>
          <label>
            <span>Notes</span>
            <select value={tableNotesFilter} onChange={(event) => onSetTableNotesFilter(event.target.value)}>
              <option value="all">All notes</option>
              <option value="manual">Has manual notes</option>
              <option value="missing">Missing notes</option>
            </select>
          </label>
          <button className="text-button" type="button" onClick={onDownloadUnknownTablesCsv}>
            Export unknown CSV
          </button>
        </div>
        <div className="table-list">
          {filteredTables.length === 0 ? (
            <p className="empty-state">No tables match the current filters.</p>
          ) : filteredTables.map((table) => (
            <div
              className={table.id === selectedTable.id ? 'table-item selected' : 'table-item'}
              key={table.id}
            >
              <button
                aria-label={`${favoriteObjects.includes(table.id) ? 'Unpin' : 'Pin'} ${table.id}`}
                className="favorite-toggle"
                onClick={() => onToggleFavoriteObject(table.id)}
                title={favoriteObjects.includes(table.id) ? 'Unpin object' : 'Pin object'}
                type="button"
              >
                <Star size={12} fill={favoriteObjects.includes(table.id) ? 'currentColor' : 'none'} />
              </button>
              <button className="table-item-main" type="button" onClick={() => onSelectTable(table.id)}>
                <span className="table-item-name" title={table.name}>{table.name}</span>
                <span className="table-item-badges">
                  {table.hasManualNotes && <span className="notes-dot" title="Manual notes present">Notes</span>}
                  <ConfidenceBadge value={table.confidence} />
                </span>
              </button>
            </div>
          ))}
        </div>
      </aside>
      <article className="table-detail">
        <div className="detail-heading">
          <div>
            <h2>{selectedTable.name}</h2>
            <p>{selectedTable.summary}</p>
          </div>
          <div className="heading-actions">
            <ConfidenceBadge value={selectedTable.confidence} />
            {selectedTable.hasManualNotes && <span className="notes-badge">Manual notes</span>}
            <button
              className="icon-button"
              type="button"
              title="Download table JSON"
              onClick={onDownloadTableJson}
            >
              <Download size={17} />
            </button>
            <button
              className="text-button"
              type="button"
              onClick={onDownloadTableCsv}
            >
              Columns CSV
            </button>
            <button
              className="text-button"
              type="button"
              onClick={onDownloadRelationshipsCsv}
            >
              Relationships CSV
            </button>
            <button
              className="text-button"
              type="button"
              onClick={onDownloadTableMarkdown}
            >
              Markdown
            </button>
          </div>
        </div>

        <section className="guidance-panel">
          <div>
            <h3>
              <FileSearch size={18} />
              Read-only guidance
            </h3>
            <ul>
              {selectedTable.safeReportingNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>
              <AlertTriangle size={18} />
              Warnings
            </h3>
            <ul>
              {selectedTable.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="table-context-grid" aria-label="Table reporting context">
          <TableContextBar
            activePanel={activeContextPanel}
            columnLifecycleItems={columnLifecycleItems}
            relatedObjects={relatedObjects}
            tableStability={tableStability}
            tableVersionTrend={tableVersionTrend}
            navigateToTable={navigateToTable}
            onActivePanelChange={setActiveContextPanel}
          />
        </section>

        <nav className="table-detail-tabs" aria-label="Table detail sections">
          {[
            ['columns', 'Columns'],
            ['keys', 'Keys'],
            ['indexes', 'Indexes'],
            ['relationships', 'Relationships'],
            ['scripts', 'Scripts'],
            ['notes', 'Notes'],
          ].map(([value, label]) => (
            <button
              className={activeTableTab === value ? 'selected' : ''}
              key={value}
              onClick={() => setActiveTableTab(value)}
              type="button"
            >
              {label} <span>{tabCounts[value]}</span>
            </button>
          ))}
        </nav>

        {activeTableTab === 'notes' && editingEnabled && ManualNotesEditor && (
          <Suspense fallback={null}>
            <ManualNotesEditor
              localNote={localNote}
              localNotesKey={localNotesKey}
              localNoteChanged={localNoteChanged}
              selectedTable={selectedTable}
              onExportLocalNotes={onExportLocalNotes}
              onExportVersionNotes={onExportVersionNotes}
              onImportLocalNotes={onImportLocalNotes}
              onClear={onClearLocalNote}
              onSave={onSaveLocalNote}
            />
          </Suspense>
        )}

        {activeTableTab === 'notes' && !editingEnabled && (
          <section className="metadata-list table-notes-readonly">
            <div className="section-title-row">
              <h3>Manual notes</h3>
              <span>{selectedTable.reviewStatus ?? (selectedTable.hasManualNotes ? 'Available' : 'Pending')}</span>
            </div>
            <p>{selectedTable.summary}</p>
            {reviewAgeWarning && <p className="notes-stale-warning">{reviewAgeWarning}</p>}
            <dl className="notes-review-metadata">
              <div><dt>Owner</dt><dd>{selectedTable.owner || 'Unassigned'}</dd></div>
              <div><dt>Reviewer</dt><dd>{selectedTable.reviewer || 'Unassigned'}</dd></div>
              <div><dt>Last reviewed</dt><dd>{selectedTable.lastReviewedAt || 'Not reviewed'}</dd></div>
            </dl>
          </section>
        )}

        {activeTableTab === 'keys' && (
          <section className="metadata-panels metadata-panels-single">
            <MetadataList
              title="Keys"
              items={selectedTable.keys}
              emptyText="No primary or unique keys exported."
              renderItem={(key) => (
                <>
                  <strong>{key.name}</strong>
                  <span>{key.typeDescription}</span>
                  <code>{key.columns.map((column) => column.columnName).join(', ')}</code>
                </>
              )}
            />
          </section>
        )}

        {activeTableTab === 'indexes' && (
          <section className="metadata-panels metadata-panels-single">
            <MetadataList
              title="Indexes"
              items={selectedTable.indexes}
              emptyText="No indexes exported."
              renderItem={(index) => (
                <>
                  <strong>{index.name}</strong>
                  <span>{index.typeDescription}</span>
                  <code>{index.columns.map((column) => column.columnName).join(', ')}</code>
                </>
              )}
            />
            <MetadataList
              title="Triggers"
              items={selectedTable.triggers}
              emptyText="No triggers exported."
              renderItem={(trigger) => (
                <>
                  <strong>{trigger.name}</strong>
                  <span>{trigger.isDisabled ? 'Disabled' : 'Enabled'}</span>
                  <code>{trigger.isInsteadOfTrigger ? 'INSTEAD OF' : 'AFTER'}</code>
                </>
              )}
            />
          </section>
        )}

        {activeTableTab === 'relationships' && (
          <section className="table-relationship-tab">
            <div className="section-title-row">
              <h3>Relationships</h3>
              <GitBranch size={18} />
            </div>
            <DependencyGraph table={{ ...selectedTable, relationships: visibleRelationships }} />
            <div className="segmented-control" aria-label="Relationship filter">
              {[
                ['all', 'All'],
                ['references', 'Out'],
                ['referenced by', 'In'],
              ].map(([value, label]) => (
                <button
                  className={relationshipFilter === value ? 'selected' : ''}
                  key={value}
                  type="button"
                  onClick={() => setRelationshipFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relationship-list">
              {visibleRelationships.length === 0 ? (
                <p className="empty-state">No SQL foreign keys exported for this table.</p>
              ) : visibleRelationships.map((relationship, index) => (
                <div className="relationship-item" key={`${relationship.type}-${relationship.table}-${index}`}>
                  <span>{relationship.type}</span>
                  <button type="button" onClick={() => navigateToTable(relationship.table)}>
                    {relationship.table}
                  </button>
                  <p>{relationship.note}</p>
                  <ConfidenceBadge value={relationship.confidence} />
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTableTab === 'scripts' && (
          <section className="metadata-list table-scripts-tab">
            <div className="section-title-row">
              <h3>Related scripts</h3>
              <span>{tableReportingScripts.length}</span>
            </div>
            <TableScriptsDetails scripts={tableReportingScripts} onOpenReportingScript={onOpenReportingScript} />
          </section>
        )}

        {activeTableTab === 'columns' && (
          <section className="columns-section">
            <div className="section-title-row">
              <h3>Columns</h3>
              <span>{filteredColumns.length} columns</span>
            </div>
            <div className="table-tools-row">
              <label>
                <span>Find column</span>
                <input
                  aria-label="Search columns in selected table"
                  placeholder="Column name, type, or purpose"
                  value={columnQuery}
                  onChange={(event) => setColumnQuery(event.target.value)}
                />
              </label>
              <label>
                <span>Density</span>
                <select value={tableDensity} onChange={(event) => setTableDensity(event.target.value)}>
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
            </div>
            <div className={tableDensity === 'compact' ? 'columns-table columns-table-compact' : 'columns-table'} role="table" aria-label="Columns">
              <div className="table-row table-head" role="row">
                <span role="columnheader">Column</span>
                <span role="columnheader">Type</span>
                <span role="columnheader">Nullable</span>
                <span role="columnheader">Purpose</span>
                <span role="columnheader">Seen</span>
                <span role="columnheader">Status</span>
              </div>
              {visibleColumns.map((column) => {
                const lifecycle = columnLifecycleByName.get(column.name);
                return (
                <div className="table-row" role="row" key={column.name}>
                  <strong role="cell">
                    {column.name}
                    <span className="column-badges">
                      {primaryKeyColumns.has(column.name) && <em>PK</em>}
                      {foreignKeyColumns.has(column.name) && <em>FK</em>}
                      {indexedColumns.has(column.name) && <em>IX</em>}
                      {column.nullable && <em>NULL</em>}
                      {column.source?.isComputed && <em>Computed</em>}
                    </span>
                  </strong>
                  <code role="cell">{column.dataType}</code>
                  <span role="cell">{column.nullable ? 'Yes' : 'No'}</span>
                  <span role="cell">
                    {column.purpose}
                  </span>
                  <span role="cell" className="column-lifecycle-cell" title={lifecycle?.types ? `Types seen: ${lifecycle.types}` : ''}>
                    {lifecycle ? (
                      <>
                        <b>{lifecycle.stable ? 'Stable' : 'Changed'}</b>
                        <em>{lifecycle.firstSeen} {'->'} {lifecycle.lastSeen}</em>
                      </>
                    ) : (
                      'Current'
                    )}
                  </span>
                  <span role="cell"><ConfidenceBadge value={column.confidence} /></span>
                </div>
                );
              })}
            </div>
            {hiddenColumnCount > 0 && (
              <p className="virtualized-note">
                Showing the first {visibleColumns.length} matching columns. Narrow the column search to inspect the remaining {hiddenColumnCount}.
              </p>
            )}
          </section>
        )}
      </article>
    </div>
  );
}

function TableContextBar({
  activePanel,
  columnLifecycleItems,
  relatedObjects,
  tableStability,
  tableVersionTrend,
  navigateToTable,
  onActivePanelChange,
}) {
  const stableColumns = columnLifecycleItems.filter((column) => column.stable).length;
  const changedColumns = columnLifecycleItems.length - stableColumns;
  const relatedGroups = getRelatedObjectGroups(relatedObjects);
  const relatedTotal = relatedGroups.reduce((count, [, items]) => count + items.length, 0);
  const stabilitySummary = tableStability
    ? `${tableStability.appearanceCount}/${tableStability.versionCount} versions`
    : 'No trend data';
  const relatedSummary = relatedTotal === 0
    ? 'None'
    : relatedGroups.map(([label, items]) => `${items.length} ${label.toLowerCase()}`).join(', ');
  const panelItems = [
    ['stability', 'Stability', stabilitySummary],
    ['related', 'Related', relatedSummary],
    ['trend', 'Trend', `${changedColumns} changed cols`],
  ];
  const activePanelTitle = panelItems.find(([key]) => key === activePanel)?.[1] ?? '';

  return (
    <>
      <div className="table-context-bar">
        {panelItems.map(([key, label, summary]) => (
          <button
            className={activePanel === key ? 'selected' : ''}
            key={key}
            type="button"
            onClick={() => onActivePanelChange(activePanel === key ? '' : key)}
          >
            <strong>{label}</strong>
            <span>{summary}</span>
          </button>
        ))}
      </div>
      {activePanel && (
        <section className="table-context-popover" aria-label={`${activePanelTitle} details`}>
          <div className="section-title-row">
            <h3>{activePanelTitle}</h3>
            <button className="text-button" type="button" onClick={() => onActivePanelChange('')}>
              Close
            </button>
          </div>
          {activePanel === 'stability' && <VersionStabilityDetails tableStability={tableStability} />}
          {activePanel === 'related' && (
            <RelatedObjectsDetails
              groups={relatedGroups}
              navigateToTable={navigateToTable}
              total={relatedTotal}
            />
          )}
          {activePanel === 'trend' && (
            <TableTrendDetails
              columnLifecycleItems={columnLifecycleItems}
              tableVersionTrend={tableVersionTrend}
            />
          )}
        </section>
      )}
    </>
  );
}

function TableScriptsDetails({ scripts, onOpenReportingScript }) {
  return (
    <>
      {scripts.length === 0 ? (
        <p className="empty-state">No Reporting Guide scripts currently reference this table.</p>
      ) : (
        <div className="table-script-list">
          {scripts.map((script) => (
            <article key={script.scriptPath}>
              <div>
                <h4>{script.title}</h4>
                <p>{script.summary}</p>
              </div>
              <div className="table-script-tags">
                {script.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="table-script-actions">
                <button type="button" onClick={() => onOpenReportingScript(script)}>
                  Open in Reporting
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function VersionStabilityDetails({ tableStability }) {
  if (!tableStability) {
    return <p>No version trend data is available for this table.</p>;
  }

  return (
    <p>
      Seen in {tableStability.appearanceCount} of {tableStability.versionCount} imported versions
      {tableStability.firstSeen ? `, from ${tableStability.firstSeen} through ${tableStability.lastSeen}` : ''}.
    </p>
  );
}

function MetadataList({ title, items, emptyText, renderItem }) {
  return (
    <section className="metadata-list">
      <div className="section-title-row">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <div className="metadata-list-items">
          {items.slice(0, 6).map((item) => (
            <div className="metadata-list-item" key={item.name}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getRelatedObjectGroups(relatedObjects) {
  return [
    ['Views', relatedObjects.views],
    ['Routines', relatedObjects.routines],
    ['Triggers', relatedObjects.triggers],
    ['Dependencies', relatedObjects.dependencies],
  ];
}

function RelatedObjectsDetails({ groups, navigateToTable, total }) {
  return (
    <>
      {total === 0 ? (
        <p>No related views, routines, triggers, or dependencies were found in the export.</p>
      ) : (
        <div className="related-object-groups">
          {groups.map(([label, items]) => (
            items.length > 0 && (
              <div key={label}>
                <strong>{label}</strong>
                {items.map((item) => (
                  <button
                    key={`${label}:${item.key}`}
                    type="button"
                    onClick={() => {
                      if (label === 'Triggers' && item.key.includes('.')) {
                        navigateToTable(item.key);
                      }
                    }}
                  >
                    <span>{item.key}</span>
                    <em>{item.description}</em>
                  </button>
                ))}
              </div>
            )
          ))}
        </div>
      )}
    </>
  );
}

function TableTrendDetails({ columnLifecycleItems, tableVersionTrend }) {
  return (
    <>
      <div className="table-version-trend">
        {tableVersionTrend.map((item) => (
          <span className={item.present ? '' : 'missing'} key={item.version}>
            <strong>{item.version}</strong>
            {item.present ? `${item.columns} cols / ${item.keys} keys / ${item.indexes} indexes / ${item.foreignKeys} FKs` : 'Not present'}
          </span>
        ))}
      </div>
      <div className="column-lifecycle-list">
        {columnLifecycleItems.slice(0, 12).map((column) => (
          <span className={column.stable ? 'stable' : 'changed'} key={column.name}>
            <code>{column.name}</code>
            <em>
              {column.firstSeen} {'->'} {column.lastSeen}
              {column.typeCount > 1 ? ` / ${column.typeCount} types` : ''}
            </em>
          </span>
        ))}
      </div>
    </>
  );
}

function DependencyGraph({ table }) {
  const incoming = table.relationships
    .filter((relationship) => relationship.type === 'referenced by')
    .slice(0, 4);
  const outgoing = table.relationships
    .filter((relationship) => relationship.type === 'references')
    .slice(0, 4);

  return (
    <div className="graph" aria-label="Dependency graph preview">
      <div className="graph-row graph-row-related">
        {incoming.length === 0 ? (
          <span className="graph-empty">No incoming keys</span>
        ) : (
          incoming.map((relationship, index) => (
            <div className="graph-node" key={`${relationship.type}-${relationship.table}-${index}`} title={relationship.table}>
              {relationship.shortName}
            </div>
          ))
        )}
      </div>
      <div className="graph-connector" />
      <div className="graph-center">
        <div className="graph-node graph-node-main" title={table.name}>
          {table.shortName}
        </div>
      </div>
      <div className="graph-connector" />
      <div className="graph-row graph-row-related">
        {outgoing.length === 0 ? (
          <span className="graph-empty">No outgoing keys</span>
        ) : (
          outgoing.map((relationship, index) => (
            <div className="graph-node" key={`${relationship.type}-${relationship.table}-${index}`} title={relationship.table}>
              {relationship.shortName}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
