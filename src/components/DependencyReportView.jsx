import { useMemo } from 'react';
import { getDependencyResolutionItems, getUnresolvedDependencyItems } from '../data/schemaAnalysis.js';
import { MetadataStat } from './MetadataStat.jsx';

export function DependencyReportView({ version, onDownloadJson }) {
  const dependencyItems = useMemo(() => getDependencyResolutionItems(version), [version]);
  const unresolvedItems = useMemo(() => getUnresolvedDependencyItems(version), [version]);
  const resolvedCount = dependencyItems.length - unresolvedItems.length;
  const ambiguousCount = dependencyItems.filter((item) => item.isAmbiguous || item.isCallerDependent).length;

  return (
    <section className="detail-surface">
      <div className="detail-heading">
        <div>
          <h2>Dependency report</h2>
          <p>Review SQL expression dependency rows that could not be matched to exported tables or objects.</p>
        </div>
        <button className="text-button" type="button" onClick={onDownloadJson}>
          Export dependencies
        </button>
      </div>

      <div className="health-summary">
        <MetadataStat label="Dependencies" value={dependencyItems.length} />
        <MetadataStat label="Resolved" value={resolvedCount} />
        <MetadataStat label="Unresolved" value={unresolvedItems.length} />
        <MetadataStat label="Ambiguous" value={ambiguousCount} />
      </div>

      <div className="dependency-report-note" role="note">
        SQL Server dependency metadata can include aliases, pseudo tables, check constraints, caller-dependent names,
        or helper objects that are not standalone exported schema objects. Unresolved rows are warnings for diagram
        completeness, not proof that the database is invalid.
      </div>

      <div className="dependency-report-list">
        {unresolvedItems.length === 0 ? (
          <p className="empty-state">All exported SQL expression dependencies resolved to exported objects.</p>
        ) : (
          unresolvedItems.map((item) => (
            <article className="dependency-report-row" key={item.id}>
              <div>
                <strong>{item.status}</strong>
                <span>Row {item.index + 1}</span>
              </div>
              <dl>
                <div>
                  <dt>Referencing</dt>
                  <dd>
                    <code>{item.referencingObjectKey || 'Missing'}</code>
                    <span>{item.referencingResolvedKey || 'Not resolved'}</span>
                  </dd>
                </div>
                <div>
                  <dt>Referenced</dt>
                  <dd>
                    <code>{item.referencedObjectKey || item.referencedEntityName || 'Missing'}</code>
                    <span>{item.referencedResolvedKey || 'Not resolved'}</span>
                  </dd>
                </div>
                <div>
                  <dt>Flags</dt>
                  <dd>
                    {[
                      item.isAmbiguous ? 'ambiguous' : '',
                      item.isCallerDependent ? 'caller dependent' : '',
                      item.isSchemaBoundReference ? 'schema bound' : '',
                    ].filter(Boolean).join(', ') || 'none'}
                  </dd>
                </div>
                <div>
                  <dt>Likely reason</dt>
                  <dd>{item.likelyReason}</dd>
                </div>
                <div>
                  <dt>Suggested fix</dt>
                  <dd>{item.suggestedFix}</dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
