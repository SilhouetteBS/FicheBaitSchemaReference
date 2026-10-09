import { useEffect, useMemo, useRef } from 'react';
import { getObjectRelatedItems } from '../data/projectInsights.js';
import { getColumnUsages, getReviewItems } from '../data/schemaAnalysis.js';

export function ObjectExplorer({
  objectType,
  onObjectTypeChange,
  columnUsageQuery,
  onColumnUsageQueryChange,
  version,
  onDownloadReviewQueue,
  onSelectTable,
  selectedObjectKey,
  onSelectedObjectChange,
}) {
  const detailPanelRef = useRef(null);
  const objects = {
    views: version.source.views ?? [],
    routines: version.source.routines ?? [],
    triggers: version.source.triggers ?? [],
    dependencies: version.source.dependencies ?? [],
  };
  const selectedObjects = objects[objectType] ?? [];
  const selectedObject =
    selectedObjects.find((item, index) => getObjectKey(item, index) === selectedObjectKey) ?? selectedObjects[0];
  const reviewItems = useMemo(() => getReviewItems(version), [version]);
  const columnUsages = useMemo(() => getColumnUsages(version, columnUsageQuery), [columnUsageQuery, version]);
  const selectedObjectTypeLabel = objectType.replace(/s$/, '');
  const selectedObjectRelatedItems = useMemo(
    () => (selectedObject ? getObjectRelatedItems(version, selectedObject) : { parent: [], dependencies: [] }),
    [selectedObject, version],
  );

  useEffect(() => {
    if (selectedObject && getObjectKey(selectedObject) !== selectedObjectKey) onSelectedObjectChange(getObjectKey(selectedObject));
  }, [selectedObject, selectedObjectKey, onSelectedObjectChange]);

  function openObjectDetails(objectKey) {
    if (objectType === 'dependencies') {
      return;
    }

    onSelectedObjectChange(objectKey);
    window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      detailPanelRef.current?.focus({ preventScroll: true });
    });
  }

  return (
    <section className="detail-surface">
      <div className="detail-heading">
        <div>
          <h2>Schema objects</h2>
          <p>Explore exported views, routines, triggers, and dependency references.</p>
        </div>
      </div>
      <div className="object-tabs">
        {Object.entries(objects).map(([key, items]) => (
          <button
            className={objectType === key ? 'selected' : ''}
            key={key}
            type="button"
            onClick={() => onObjectTypeChange(key)}
          >
            {key} <span>{items.length}</span>
          </button>
        ))}
      </div>
      <div className="object-tools">
        <section className="review-queue">
          <div className="section-title-row">
            <h3>Documentation review queue</h3>
            <span>{reviewItems.length}</span>
          </div>
          <button className="text-button" type="button" onClick={onDownloadReviewQueue}>
            Export queue
          </button>
          <div className="review-list">
            {reviewItems.map((item) => (
              <button key={item.key} type="button" onClick={() => onSelectTable(item.key)}>
                <strong>{item.key}</strong>
                <span>
                  {item.confidence} - {item.columnsNeedingReview} unknown columns - {item.relationshipCount} relationships
                </span>
                <span>{item.reason}</span>
                {item.hasManualNotes && <em>notes started</em>}
                <em>priority {item.score}</em>
              </button>
            ))}
          </div>
        </section>
        <section className="column-usage">
          <div className="section-title-row">
            <h3>Column usage search</h3>
            <span>{columnUsages.length}</span>
          </div>
          <input
            aria-label="Search column usage"
            value={columnUsageQuery}
            onChange={(event) => onColumnUsageQueryChange(event.target.value)}
            placeholder="Search column name, type, purpose"
          />
          <div className="usage-list">
            {columnUsages.length === 0 ? (
              <p className="empty-state">Enter a column name such as bp_id or tenant_id.</p>
            ) : (
              columnUsages.map((usage) => (
                <button
                  key={`${usage.tableKey}-${usage.columnName}`}
                  type="button"
                  onClick={() => onSelectTable(usage.tableKey)}
                >
                  <strong>{usage.tableKey}.{usage.columnName}</strong>
                  <span>{usage.dataType}</span>
                  <em>
                    {usage.indexedBy.length} indexes - {usage.foreignKeys.length} foreign keys
                  </em>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
      <div className={objectType === 'dependencies' ? 'object-explorer-grid object-explorer-grid-list-only' : 'object-explorer-grid'}>
        <div className="object-list">
          {selectedObjects.length === 0 ? (
            <p className="empty-state">No {objectType} exported.</p>
          ) : (
            selectedObjects.map((item, index) => {
              const objectKey = getObjectKey(item, index);
              return (
                <article
                  className={selectedObject === item ? 'object-item selected' : 'object-item'}
                  key={`${objectType}-${objectKey}${objectType === 'dependencies' ? `-${index}` : ''}`}
                >
                  {objectType === 'dependencies' ? (
                    <>
                      <strong>{objectKey}</strong>
                      <p>{item.typeDescription ?? item.parentObjectTypeDescription ?? item.referencingObjectTypeDescription}</p>
                    </>
                  ) : (
                    <button className="object-item-open" type="button" onClick={() => openObjectDetails(objectKey)}>
                      <strong>{objectKey}</strong>
                      <p>{item.typeDescription ?? item.parentObjectTypeDescription ?? item.referencingObjectTypeDescription}</p>
                      {item.referencedObjectKey && <code>{item.referencedObjectKey}</code>}
                    </button>
                  )}
                  {item.parentObjectKey && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectTable(item.parentObjectKey);
                      }}
                    >
                      {item.parentObjectKey}
                    </button>
                  )}
                  {objectType === 'dependencies' && item.referencedObjectKey && <code>{item.referencedObjectKey}</code>}
                </article>
              );
            })
          )}
        </div>
        {selectedObject && objectType !== 'dependencies' && (
          <section
            className="object-detail-panel"
            ref={detailPanelRef}
            tabIndex={-1}
          >
            <div>
              <p className="snapshot-kicker">{selectedObjectTypeLabel}</p>
              <h3>{getObjectKey(selectedObject)}</h3>
              <p>{selectedObject.typeDescription ?? selectedObject.parentObjectTypeDescription ?? 'Exported SQL object'}</p>
            </div>
            <dl>
              {getObjectDetailRows(selectedObject).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
            <div className="object-definition-preview">
              <strong>Definition preview</strong>
              {getDefinitionText(selectedObject) ? (
                <pre>{getDefinitionText(selectedObject)}</pre>
              ) : (
                <p>
                  Definition text was not included in this export. The exported definition hash is review metadata and
                  is not counted as a schema change by itself.
                </p>
              )}
            </div>
            <div className="object-related-panel">
              <strong>Related objects</strong>
              {selectedObjectRelatedItems.parent.length + selectedObjectRelatedItems.dependencies.length === 0 ? (
                <p>No parent or dependency rows were matched for this object.</p>
              ) : (
                <div className="related-object-groups">
                  {selectedObjectRelatedItems.parent.length > 0 && (
                    <div>
                      <strong>Parent</strong>
                      {selectedObjectRelatedItems.parent.map((item) => (
                        <button key={item.key} type="button" onClick={() => onSelectTable(item.key)}>
                          <span>{item.key}</span>
                          <em>{item.description}</em>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedObjectRelatedItems.dependencies.length > 0 && (
                    <div>
                      <strong>Dependencies</strong>
                      {selectedObjectRelatedItems.dependencies.map((item) => (
                        <button key={item.key} type="button" onClick={() => {
                          const target = item.key.split(' -> ').find((key) => key !== getObjectKey(selectedObject));
                          if (version.tables.some((table) => table.id === target)) {
                            onSelectTable(target);
                            return;
                          }
                          const match = Object.entries(objects).find(([type, items]) => type !== 'dependencies'
                            && items.some((object) => getObjectKey(object) === target));
                          if (match) {
                            onObjectTypeChange(match[0]);
                            onSelectedObjectChange(target);
                          }
                        }} disabled={!item.key.split(' -> ').some((key) => key !== getObjectKey(selectedObject)
                          && (version.tables.some((table) => table.id === key)
                            || Object.entries(objects).some(([type, items]) => type !== 'dependencies'
                              && items.some((object) => getObjectKey(object) === key))))}>
                          <span>{item.key}</span>
                          <em>{item.description}</em>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function getObjectKey(item, index = 0) {
  return item.key ?? item.name ?? item.referencingObjectKey ?? `object-${index + 1}`;
}

function getDefinitionText(object) {
  return object?.definition ?? object?.definitionText ?? object?.sqlDefinition ?? object?.objectDefinition ?? '';
}

function getObjectDetailRows(object) {
  return [
    ['Schema', object.schemaName],
    ['Type', object.typeDescription ?? object.parentObjectTypeDescription],
    ['Parent', object.parentObjectKey],
    ['Disabled', object.isDisabled === undefined ? undefined : object.isDisabled ? 'Yes' : 'No'],
    ['Instead of trigger', object.isInsteadOfTrigger === undefined ? undefined : object.isInsteadOfTrigger ? 'Yes' : 'No'],
    ['Parameters', object.parameters?.length],
    ['Dependencies', object.dependencies?.length],
    ['Definition hash', object.definitionSha256],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
}
