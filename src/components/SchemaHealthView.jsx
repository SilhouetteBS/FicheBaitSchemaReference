import { useMemo } from 'react';
import { getReviewItems, getSchemaHealthItems, getUnresolvedDependencyItems } from '../data/schemaAnalysis.js';
import { MetadataStat } from './MetadataStat.jsx';

export function SchemaHealthView({ version, onDownloadJson, onSelectTable }) {
  const healthItems = useMemo(() => getSchemaHealthItems(version), [version]);
  const reviewItems = useMemo(() => getReviewItems(version), [version]);
  const unresolvedDependencies = useMemo(() => getUnresolvedDependencyItems(version), [version]);

  return (
    <section className="detail-surface">
      <div className="detail-heading">
        <div>
          <h2>Schema checks</h2>
          <p>Review structural flags that affect reporting joins, table risk, and documentation priority.</p>
        </div>
        <button className="text-button" type="button" onClick={onDownloadJson}>
          Export checks
        </button>
      </div>
      <div className="health-summary">
        <MetadataStat label="Flagged tables" value={healthItems.length} />
        <MetadataStat
          label="No primary key"
          value={healthItems.filter((item) => item.primaryKeyCount === 0).length}
        />
        <MetadataStat
          label="FK warnings"
          value={healthItems.reduce((total, item) => total + item.untrustedForeignKeyCount, 0)}
        />
        <MetadataStat
          label="Triggered"
          value={healthItems.filter((item) => item.triggerCount > 0).length}
        />
        <MetadataStat
          label="Needs docs"
          value={reviewItems.length}
        />
        <MetadataStat
          label="Unresolved dependencies"
          value={unresolvedDependencies.length}
        />
      </div>
      <section className="health-section">
        <div className="section-title-row">
          <h3>Needs documentation queue</h3>
          <span>{reviewItems.length}</span>
        </div>
        <p>
          Tables are sorted by missing notes, relationship density, indexes, triggers, and unknown columns so reviewers
          can start with objects that are most likely to help reporting users.
        </p>
        <div className="health-list">
          {reviewItems.map((item) => (
            <button className="health-row health-row-review" key={item.key} type="button" onClick={() => onSelectTable(item.key)}>
              <strong>{item.key}</strong>
              <span>{item.relationshipCount} relationships</span>
              <span>{item.columnsNeedingReview} unknown columns</span>
              <span>{item.hasManualNotes ? 'Has notes' : 'Missing notes'}</span>
              <span>{item.score} priority</span>
              <em>{item.reason}</em>
            </button>
          ))}
        </div>
      </section>
      <section className="health-section">
        <div className="section-title-row">
          <h3>Structural flags</h3>
          <span>{healthItems.length}</span>
        </div>
        <div className="health-list">
          {healthItems.map((item) => (
            <button className="health-row" key={item.key} type="button" onClick={() => onSelectTable(item.key)}>
              <strong>{item.key}</strong>
              <span>{item.primaryKeyCount} PKs</span>
              <span>{item.untrustedForeignKeyCount} FK warnings</span>
              <span>{item.triggerCount} triggers</span>
              <span>{item.computedColumnCount} computed</span>
              <em>{item.riskFlags.join(', ')}</em>
            </button>
          ))}
        </div>
      </section>
      <section className="health-section">
        <div className="section-title-row">
          <h3>Unresolved dependency drilldown</h3>
          <span>{unresolvedDependencies.length}</span>
        </div>
        <p>
          These rows come from SQL Server dependency metadata that could not be matched to exported tables, views,
          routines, or triggers. They are completeness warnings, not proof of an invalid database.
        </p>
        <div className="dependency-resolution-list">
          {unresolvedDependencies.length === 0 ? (
            <p className="empty-state">No unresolved dependency rows were found.</p>
          ) : unresolvedDependencies.map((item) => (
            <article key={item.id}>
              <strong>{item.referencingObjectKey || 'Unknown'} {'->'} {item.referencedObjectKey || item.referencedEntityName || 'Unknown'}</strong>
              <span>{item.status}</span>
              <p>{item.likelyReason}</p>
              <em>{item.suggestedFix}</em>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
