import { Clipboard, ExternalLink, FileText } from 'lucide-react';

function getObjectTypeLabel(type) {
  return {
    table: 'Table',
    view: 'View',
    routine: 'Routine',
    trigger: 'Trigger',
  }[type] ?? type;
}

export function DiagramCanvas({
  activeEdgeId,
  compactColumns,
  diagram,
  edgeLabelMode = 'minimal',
  focusKey,
  mode,
  pinnedEdgeId,
  productName,
  version,
  visibleDiagramEdges,
  zoom,
  onCopyObjectKey,
  onEdgeBlur,
  onEdgeClick,
  onEdgeFocus,
  onEdgeKeyDown,
  onEdgeMouseEnter,
  onEdgeMouseLeave,
  onNodeDoubleClick,
  onNodeOpen,
  onNodeSelect,
  getDiagramEdgeGeometry,
  getEdgeClassName,
  getEdgeTooltip,
  getEndpointLabelX,
  getEndpointTextAnchor,
  shouldRenderHighlightOverlay,
}) {
  function getVisibleEdgeLabel(edge) {
    if (edgeLabelMode === 'columns') {
      return edge.columnSummary || edge.label;
    }
    if (edgeLabelMode === 'full') {
      return edge.label;
    }
    return '';
  }

  return (
    <div
      className={compactColumns ? 'database-diagram diagram-cards-compact' : 'database-diagram'}
      style={{ width: `${diagram.width * zoom}px`, height: `${diagram.height * zoom}px` }}
    >
      <svg
        className="diagram-lines"
        role="group"
        aria-label={`Database relationships for ${productName} ${version.version}`}
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
      >
        <defs>
          <marker id="diagram-arrow-fk" markerHeight="15" markerUnits="userSpaceOnUse" markerWidth="15" orient="auto" refX="11.5" refY="7.5" viewBox="0 0 15 15">
            <path d="M 0 2 L 14 7.5 L 0 13 z" />
          </marker>
          <marker id="diagram-arrow-dependency" markerHeight="15" markerUnits="userSpaceOnUse" markerWidth="15" orient="auto" refX="11.5" refY="7.5" viewBox="0 0 15 15">
            <path d="M 0 2 L 14 7.5 L 0 13 z" />
          </marker>
          <marker id="diagram-arrow-focus" markerHeight="16" markerUnits="userSpaceOnUse" markerWidth="16" orient="auto" refX="12.25" refY="8" viewBox="0 0 16 16">
            <path d="M 0 2 L 15 8 L 0 14 z" />
          </marker>
          <marker id="diagram-arrow-selected" markerHeight="17" markerUnits="userSpaceOnUse" markerWidth="17" orient="auto" refX="13" refY="8.5" viewBox="0 0 17 17">
            <path d="M 0 2 L 16 8.5 L 0 15 z" />
          </marker>
        </defs>
        {visibleDiagramEdges.map((edge) => {
          const geometry = getDiagramEdgeGeometry(edge);
          const isActiveEdge = activeEdgeId === edge.id;
          const edgeLabel = getVisibleEdgeLabel(edge);
          if (!geometry) {
            return null;
          }
          return (
            <g key={edge.id}>
              <title>{getEdgeTooltip(edge)}</title>
              <path
                aria-label={`${edge.type === 'foreignKey' ? 'Select foreign key' : 'Select dependency'} ${edge.label}: ${edge.columnSummary || `${edge.from} to ${edge.to}`}`}
                aria-pressed={pinnedEdgeId === edge.id}
                className="diagram-edge-hit-target"
                d={geometry.path}
                onBlur={onEdgeBlur}
                onClick={() => onEdgeClick(edge.id)}
                onFocus={() => onEdgeFocus(edge.id)}
                onKeyDown={(event) => onEdgeKeyDown(event, edge.id)}
                onMouseEnter={() => onEdgeMouseEnter(edge.id)}
                onMouseLeave={onEdgeMouseLeave}
                role="button"
                tabIndex={0}
              />
              <path
                aria-hidden="true"
                className={`${getEdgeClassName(edge, 'diagram-edge')} ${
                  geometry.usesBundling ? 'diagram-edge-bundled' : ''
                } ${geometry.sourceColumnHidden || geometry.targetColumnHidden ? 'diagram-edge-column-fallback' : ''}`}
                d={geometry.path}
                markerEnd={
                  isActiveEdge
                    ? 'url(#diagram-arrow-selected)'
                    : `url(#diagram-arrow-${edge.type === 'foreignKey' ? 'fk' : 'dependency'})`
                }
              />
              {edgeLabel ? (
                <text
                  className="diagram-edge-label diagram-edge-label-visible"
                  x={geometry.midX}
                  y={Math.min(geometry.startY, geometry.endY) + Math.abs(geometry.endY - geometry.startY) / 2 - 8}
                >
                  {edgeLabel}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {mode === 'focused' && (
        <div className="diagram-lane-layer" aria-hidden="true">
          {['Focused', 'Related', 'Other'].map((lane) => {
            const laneNodes = diagram.nodes.filter((node) => node.lane === lane);
            if (laneNodes.length === 0) {
              return null;
            }
            const laneLeft = Math.min(...laneNodes.map((node) => node.x));
            const laneRight = Math.max(...laneNodes.map((node) => node.x + node.width));
            return (
              <span
                className={`diagram-lane-label diagram-lane-label-${lane.toLowerCase()}`}
                key={lane}
                style={{
                  left: `${laneLeft * zoom}px`,
                  top: `${8 * zoom}px`,
                  width: `${(laneRight - laneLeft) * zoom}px`,
                }}
              >
                {lane === 'Focused' ? 'Focused' : lane === 'Related' ? 'Direct' : 'Second-hop'}
              </span>
            );
          })}
          {['Related', 'Other'].map((lane) => {
            const laneNodes = diagram.nodes.filter((node) => node.lane === lane);
            if (laneNodes.length === 0) {
              return null;
            }
            const laneLeft = Math.min(...laneNodes.map((node) => node.x));
            return (
              <span
                className="diagram-lane-separator"
                key={lane}
                style={{
                  height: `${diagram.height * zoom}px`,
                  left: `${(laneLeft - 42) * zoom}px`,
                }}
              />
            );
          })}
        </div>
      )}

      {diagram.nodes.map((node) => (
        <div
          className={`diagram-box diagram-box-${node.type} ${
            node.key === focusKey ? 'diagram-node-focused' : ''
          } ${focusKey && diagram.connectedKeys.has(node.key) ? 'diagram-node-connected' : ''}`}
          key={node.key}
          style={{
            left: `${node.x * zoom}px`,
            top: `${node.y * zoom}px`,
            width: `${node.width * zoom}px`,
            height: `${node.height * zoom}px`,
          }}
          data-node-key={node.key}
          title={node.key}
        >
          <button
            aria-label={`Select diagram object ${node.key}`}
            className="diagram-box-title"
            onClick={() => onNodeSelect(node)}
            onDoubleClick={() => onNodeDoubleClick(node)}
            type="button"
          >
            <span>{node.label}</span>
            <span className={`diagram-object-badge diagram-object-badge-${node.type}`}>
              {getObjectTypeLabel(node.type)}
            </span>
          </button>
          <span className="diagram-box-actions">
            <button
              aria-label={`Copy object key ${node.key}`}
              title="Copy object key"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCopyObjectKey(node.key);
              }}
            >
              <Clipboard size={12} />
            </button>
            <button
              aria-label={node.type === 'table' ? `Open table details ${node.key}` : `Open object details ${node.key}`}
              title={node.type === 'table' ? 'Open table details' : 'Open object details'}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNodeOpen(node);
              }}
            >
              {node.type === 'table' ? <ExternalLink size={12} /> : <FileText size={12} />}
            </button>
          </span>
          {node.type === 'table' ? (
            <>
              {/* The constrained list must be focusable so keyboard users can scroll it. */}
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
              <span className="diagram-column-list" role="region" tabIndex={0} aria-label={`${node.key} columns`}>
              {(compactColumns ? node.columns.slice(0, 8) : node.columns).map((column) => (
                <span className="diagram-column-row" data-column-name={column.name} key={column.name}>
                  <span className={column.isPrimaryKey ? 'diagram-key-marker visible' : 'diagram-key-marker'}>
                    PK
                  </span>
                  <span className="diagram-column-name">{column.name}</span>
                  <span className="diagram-column-type">{column.dataType}</span>
                </span>
              ))}
              {compactColumns && node.columns.length > 8 && (
                <span className="diagram-column-more">+{node.columns.length - 8} more</span>
              )}
              </span>
            </>
          ) : (
            <span className="diagram-object-kind">
              <span>{diagram.groupLabels[node.type] ?? node.type}</span>
              <code>{node.key}</code>
            </span>
          )}
        </div>
      ))}

      <svg
        className="diagram-highlight-lines"
        aria-hidden="true"
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
      >
        {visibleDiagramEdges
          .filter((edge) => shouldRenderHighlightOverlay(edge))
          .map((edge) => {
            const geometry = getDiagramEdgeGeometry(edge);
            const isActiveEdge = activeEdgeId === edge.id;
            if (!geometry) {
              return null;
            }
            const startAnchor = getEndpointTextAnchor(geometry.startX, geometry.endX, true);
            const endAnchor = getEndpointTextAnchor(geometry.startX, geometry.endX, false);
            return (
              <g key={`${edge.id}:highlight`}>
                <g className="diagram-edge-endpoints">
                  <circle cx={geometry.startX} cy={geometry.startY} r="3.5" />
                  <circle cx={geometry.endX} cy={geometry.endY} r="3.5" />
                </g>
                <path
                  className={`${getEdgeClassName(edge, 'diagram-edge-highlight-overlay')} ${
                    geometry.usesBundling ? 'diagram-edge-bundled' : ''
                  } ${geometry.sourceColumnHidden || geometry.targetColumnHidden ? 'diagram-edge-column-fallback' : ''}`}
                  d={geometry.path}
                  markerEnd={
                    activeEdgeId === edge.id ? 'url(#diagram-arrow-selected)' : 'url(#diagram-arrow-focus)'
                  }
                />
                <title>{edge.columnSummary || edge.label}</title>
                {isActiveEdge && edge.type === 'foreignKey' ? (
                  <>
                    <text
                      className="diagram-cardinality-label diagram-cardinality-label-selected"
                      textAnchor={startAnchor}
                      x={getEndpointLabelX(geometry.startX, geometry.endX, true)}
                      y={geometry.startY - 9}
                    >
                      many
                    </text>
                    <text
                      className="diagram-cardinality-label diagram-cardinality-label-selected"
                      textAnchor={endAnchor}
                      x={getEndpointLabelX(geometry.startX, geometry.endX, false)}
                      y={geometry.endY - 9}
                    >
                      one
                    </text>
                    <text
                      className="diagram-edge-label"
                      x={geometry.midX}
                      y={Math.min(geometry.startY, geometry.endY) + Math.abs(geometry.endY - geometry.startY) / 2 - 10}
                    >
                      {edge.columnSummary || edge.label}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
