import { useMemo } from 'react';
import { getTableImpactItems } from '../data/schemaAnalysis.js';

export function ImpactView({ version, localNotesForVersion, onDownloadJson, onSelectTable }) {
  const impactItems = useMemo(() => getTableImpactItems(version), [version]);
  const localNoteKeys = new Set(Object.keys(localNotesForVersion));

  return (
    <section className="detail-surface">
      <div className="detail-heading">
        <div>
          <h2>Table impact</h2>
          <p>Prioritize documentation by relationship density, dependency usage, database objects, and note status.</p>
        </div>
        <button className="text-button" type="button" onClick={onDownloadJson}>
          Export impact
        </button>
      </div>
      <div className="impact-list">
        {impactItems.map((item, index) => (
          <button className="impact-row" key={item.key} type="button" onClick={() => onSelectTable(item.key)}>
            <span className="impact-rank">{index + 1}</span>
            <strong>{item.key}</strong>
            <span>{item.relationshipCount} relations</span>
            <span>{item.dependencyCount} deps</span>
            <span>{item.indexCount} indexes</span>
            <span>{item.triggerCount} triggers</span>
            <span>{item.unknownColumns} unknown cols</span>
            <em>
              {localNoteKeys.has(item.key) ? 'local note' : item.hasManualNotes ? 'checked-in note' : 'needs notes'}
            </em>
            <b>{item.score}</b>
          </button>
        ))}
      </div>
    </section>
  );
}
