import {
  Clipboard,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  X,
} from 'lucide-react';

const minRelationshipPanelWidth = 260;
const maxRelationshipPanelWidth = 560;

function clampRelationshipPanelWidth(value) {
  return Math.min(maxRelationshipPanelWidth, Math.max(minRelationshipPanelWidth, value));
}

function getConfidenceLabel(value) {
  return {
    confirmed: 'Confirmed',
    observed: 'Observed',
    inferred: 'Inferred',
    unknown: 'Unknown',
    deprecated: 'Deprecated',
    do_not_rely_on: 'Do not rely',
  }[value] ?? 'Unknown';
}

function SelectedRelationshipCard({
  pinnedEdgeId,
  relationship,
  onClearSelectedRelationship,
  onCopyRelationshipName,
}) {
  if (!relationship) {
    return (
      <p className="relationship-selected-placeholder">Hover or select a relationship to inspect details.</p>
    );
  }

  return (
    <div className="relationship-selected-detail" aria-live="polite">
      <span>Selected relationship</span>
      {pinnedEdgeId ? (
        <button
          aria-label="Clear selected relationship"
          className="relationship-clear-button"
          onClick={onClearSelectedRelationship}
          title="Clear selected relationship"
          type="button"
        >
          <X size={13} />
        </button>
      ) : null}
      <button
        aria-label="Copy relationship name"
        className="relationship-copy-button"
        onClick={() => onCopyRelationshipName(relationship.label)}
        title="Copy relationship name"
        type="button"
      >
        <Clipboard size={13} />
      </button>
      <strong>{relationship.label}</strong>
      <dl>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`relationship-status relationship-status-${relationship.confidence}`}>
              {getConfidenceLabel(relationship.confidence)}
            </span>
            {relationship.status}
          </dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{relationship.type === 'foreignKey' ? 'Foreign key' : relationship.type === 'triggerParent' ? 'Trigger parent' : 'Dependency'}</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{relationship.direction}</dd>
        </div>
        <div>
          <dt>From</dt>
          <dd>
            <span className={`relationship-object-type relationship-object-type-${relationship.fromType}`}>
              {relationship.fromTypeLabel}
            </span>
            {relationship.from}
          </dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>
            <span className={`relationship-object-type relationship-object-type-${relationship.toType}`}>
              {relationship.toTypeLabel}
            </span>
            {relationship.to}
          </dd>
        </div>
        <div>
          <dt>Columns</dt>
          <dd>{relationship.columnSummary || 'Not column based'}</dd>
        </div>
        {relationship.type === 'foreignKey' ? (
          <>
            <div>
              <dt>Source</dt>
              <dd>{relationship.sourceColumnSummary || 'Unknown'}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>{relationship.targetColumnSummary || 'Unknown'}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </div>
  );
}

export function FocusedRelationshipPanel({
  activeEdgeId,
  collapsed,
  edgeType,
  focusedNode,
  pinnedEdgeId,
  relationshipCounts,
  relationshipDirectionFilter,
  relationshipPanelWidth,
  relationshipSections,
  selectedRelationship,
  visibleRelationshipDetails,
  onClearSelectedRelationship,
  onCopyRelationshipName,
  onRelationshipBlur,
  onRelationshipFocus,
  onRelationshipHoverEnd,
  onRelationshipHoverStart,
  onSelectRelationship,
  onSetDirectionFilter,
  onSetEdgeFilter,
  onSetPanelCollapsed,
  onSetPanelWidth,
}) {
  if (!focusedNode) {
    return null;
  }

  function resizePanelBy(delta) {
    onSetPanelWidth((currentWidth) => clampRelationshipPanelWidth(currentWidth + delta));
  }

  function startPanelResize(event) {
    if (collapsed) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = relationshipPanelWidth;
    document.body.classList.add('is-resizing-relationship-panel');

    function handlePointerMove(moveEvent) {
      onSetPanelWidth(clampRelationshipPanelWidth(startWidth + moveEvent.clientX - startX));
    }

    function stopResize() {
      document.body.classList.remove('is-resizing-relationship-panel');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize, { once: true });
    window.addEventListener('pointercancel', stopResize, { once: true });
  }

  function handleResizeKeyDown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      resizePanelBy(-20);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      resizePanelBy(20);
    }
  }

  return (
    <aside className="diagram-relationship-panel" aria-label="Focused object relationships">
      {!collapsed && (
        <button
          aria-label={`Resize focused relationship panel. Current width ${relationshipPanelWidth}px.`}
          className="relationship-panel-resize-handle"
          onKeyDown={handleResizeKeyDown}
          onPointerDown={startPanelResize}
          title="Drag to resize focused relationship panel"
          type="button"
        >
          <GripVertical size={16} />
        </button>
      )}
      <div className="relationship-panel-heading">
        <div>
          <p className="snapshot-kicker">Focused {focusedNode.type}</p>
          <h3>{focusedNode.label}</h3>
          <span>{relationshipCounts.all} relationships</span>
        </div>
        <button
          aria-label={collapsed ? 'Expand relationship panel' : 'Collapse relationship panel'}
          className="relationship-panel-toggle"
          onClick={() => onSetPanelCollapsed((current) => !current)}
          title={collapsed ? 'Expand relationship panel' : 'Collapse relationship panel'}
          type="button"
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="relationship-quick-filters" aria-label="Focused relationship filters">
            {[
              ['all', 'All', relationshipCounts.all],
              ['foreignKey', 'Foreign keys', relationshipCounts.foreignKey],
              ['dependency', 'Dependencies', relationshipCounts.dependency],
              ['triggerParent', 'Trigger parents', relationshipCounts.triggerParent],
            ].map(([value, label, count]) => (
              <button
                className={edgeType === value ? 'selected' : ''}
                key={value}
                onClick={() => onSetEdgeFilter(value)}
                type="button"
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="relationship-quick-filters relationship-direction-filters" aria-label="Relationship direction filters">
            {[
              ['all', 'All', relationshipCounts.all],
              ['incoming', 'Incoming', relationshipCounts.incoming],
              ['outgoing', 'Outgoing', relationshipCounts.outgoing],
            ].map(([value, label, count]) => (
              <button
                className={relationshipDirectionFilter === value ? 'selected' : ''}
                key={value}
                onClick={() => onSetDirectionFilter(value)}
                type="button"
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="relationship-selected-slot">
            <SelectedRelationshipCard
              pinnedEdgeId={pinnedEdgeId}
              relationship={selectedRelationship}
              onClearSelectedRelationship={onClearSelectedRelationship}
              onCopyRelationshipName={onCopyRelationshipName}
            />
          </div>
          <div className="relationship-detail-list">
            {visibleRelationshipDetails.length === 0 ? (
              <p className="empty-state">No exported relationships connect directly to this object.</p>
            ) : (
              relationshipSections.map((section) => (
                <section className="relationship-group" key={section.type}>
                  <h4>
                    {section.label}
                    <span>{section.relationships.length}</span>
                  </h4>
                  {section.relationships.map((relationship) => (
                    <button
                      className={`relationship-detail relationship-detail-${relationship.direction.replaceAll(' ', '-')} ${
                        activeEdgeId === relationship.id ? 'selected' : ''
                      }`}
                      key={relationship.id}
                      type="button"
                      aria-pressed={pinnedEdgeId === relationship.id}
                      onBlur={onRelationshipBlur}
                      onClick={() => onSelectRelationship(relationship.id)}
                      onFocus={() => onRelationshipFocus(relationship.id)}
                      onMouseEnter={() => onRelationshipHoverStart(relationship.id)}
                      onMouseLeave={onRelationshipHoverEnd}
                    >
                      <span>
                        {relationship.direction}
                        {pinnedEdgeId === relationship.id ? <PinOff size={12} /> : <Pin size={12} />}
                      </span>
                      <strong>{relationship.otherTableLabel}</strong>
                      <span className={`relationship-card-status relationship-card-status-${relationship.confidence}`}>
                        {getConfidenceLabel(relationship.confidence)}
                      </span>
                      <code>{relationship.columnSummary || relationship.label}</code>
                      <em>{relationship.label}</em>
                    </button>
                  ))}
                </section>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}
