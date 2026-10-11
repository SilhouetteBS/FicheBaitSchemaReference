export function getColumnAnchorY(node, columnName) {
  const titleHeight = 27;
  const rowHeight = 21;
  const fallbackY = node.y + node.height / 2;
  const columnIndex = node.columns?.findIndex((column) => column.name === columnName) ?? -1;

  if (columnIndex < 0) {
    return fallbackY;
  }

  const rowY = node.y + titleHeight + columnIndex * rowHeight + rowHeight / 2;
  const minY = node.y + titleHeight + rowHeight / 2;
  const maxY = node.y + node.height - 10;
  return Math.max(minY, Math.min(maxY, rowY));
}

export function getColumnAnchorState(node, columnName) {
  const titleHeight = 27;
  const rowHeight = 21;
  const columnIndex = node.columns?.findIndex((column) => column.name === columnName) ?? -1;
  if (columnIndex < 0) {
    return {
      isHidden: false,
      isKnown: false,
      y: node.y + node.height / 2,
    };
  }

  const rowY = node.y + titleHeight + columnIndex * rowHeight + rowHeight / 2;
  const minY = node.y + titleHeight + rowHeight / 2;
  const maxY = node.y + node.height - 10;
  return {
    isHidden: rowY < minY || rowY > maxY,
    isKnown: true,
    y: Math.max(minY, Math.min(maxY, rowY)),
  };
}

function getParallelOffset(edge, diagram) {
  const edgePairKey = [edge.from, edge.to].sort().join('::');
  const relatedEdges = diagram.edges.filter((item) => [item.from, item.to].sort().join('::') === edgePairKey);
  if (relatedEdges.length <= 1) {
    return 0;
  }

  const edgeIndex = Math.max(0, relatedEdges.findIndex((item) => item.id === edge.id));
  return (edgeIndex - (relatedEdges.length - 1) / 2) * 12;
}

function getNodeSafeY(node, y, edgeOffset) {
  return Math.max(node.y + 34, Math.min(node.y + node.height - 16, y + edgeOffset));
}

function buildConnectorPath({ curve, endX, endY, midX, startX, startY }) {
  if (curve) {
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  }

  return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
}

export function getRelatedEdgeAnchorY(edge, node, diagram) {
  const relatedEdges = diagram.edges.filter((item) => item.from === node.key || item.to === node.key);
  const edgeIndex = Math.max(0, relatedEdges.findIndex((item) => item.id === edge.id));
  const firstY = node.y + 42;
  return Math.min(node.y + node.height - 24, firstY + edgeIndex * 18);
}

export function getFocusedEdgeAnchorY(edge, node, diagram, focusKey) {
  if (node.key !== focusKey) {
    return getRelatedEdgeAnchorY(edge, node, diagram);
  }

  const relatedEdges = diagram.edges.filter((item) => item.from === node.key || item.to === node.key);
  const edgeIndex = Math.max(0, relatedEdges.findIndex((item) => item.id === edge.id));
  const spacing = Math.min(40, Math.max(24, node.height / (relatedEdges.length + 1)));
  const firstY = node.y + 58;
  return Math.min(node.y + node.height - 28, firstY + edgeIndex * spacing);
}

export function getFocusedEdgeGeometry(edge, focused, related, diagram, focusKey, options = {}) {
  const source = edge.from === focusKey ? focused : related;
  const target = edge.from === focusKey ? related : focused;
  const targetIsRight = source.x < target.x;
  const startX = targetIsRight ? source.x + source.width : source.x;
  const endX = targetIsRight ? target.x : target.x + target.width;
  const parallelOffset = getParallelOffset(edge, diagram);
  const startY = getNodeSafeY(source, getFocusedEdgeAnchorY(edge, source, diagram, focusKey), parallelOffset);
  const endY = getNodeSafeY(target, getFocusedEdgeAnchorY(edge, target, diagram, focusKey), parallelOffset);
  const gap = Math.abs(endX - startX);
  const midX = (targetIsRight ? startX + gap / 2 : startX - gap / 2) + parallelOffset;
  return {
    curve: Boolean(options.curve),
    startX,
    startY,
    endX,
    endY,
    midX,
    path: buildConnectorPath({
      curve: Boolean(options.curve),
      endX,
      endY,
      midX,
      startX,
      startY,
    }),
    usesBundling: parallelOffset !== 0,
  };
}

export function getEdgeAnchorY(edge, node, diagram, mode, focusKey) {
  if (mode === 'focused' && focusKey) {
    return getFocusedEdgeAnchorY(edge, node, diagram, focusKey);
  }

  const firstColumn = edge.columns?.[0];
  const columnName = node.key === edge.from ? firstColumn?.sourceColumnName : firstColumn?.referencedColumnName;
  return getColumnAnchorY(node, columnName);
}

export function getEdgeGeometry(edge, diagram, { curve = false, mode, focusKey } = {}) {
  const from = diagram.positionedByKey.get(edge.from);
  const to = diagram.positionedByKey.get(edge.to);
  if (!from || !to) {
    return null;
  }

  if (diagram.exploration && edge.from === edge.to) {
    const offset = getParallelOffset(edge, diagram);
    const startX = from.x + from.width;
    const endX = startX;
    const startY = from.y + 42;
    const endY = from.y + Math.min(from.height - 20, 80);
    const midX = startX + 38 + Math.abs(offset);
    return {startX,startY,endX,endY,midX,path:`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`};
  }

  if (mode === 'focused' && focusKey && (edge.from === focusKey || edge.to === focusKey)) {
    const focused = diagram.positionedByKey.get(focusKey);
    const relatedKey = edge.from === focusKey ? edge.to : edge.from;
    const related = diagram.positionedByKey.get(relatedKey);
    if (focused && related) {
      return getFocusedEdgeGeometry(edge, focused, related, diagram, focusKey, { curve });
    }
  }

  const effectiveMode = mode === 'focused' ? 'full' : mode;
  const fromLeft = from.x < to.x;
  const startX = fromLeft ? from.x + from.width : from.x;
  const firstColumn = edge.columns?.[0];
  const fromColumnState = getColumnAnchorState(from, firstColumn?.sourceColumnName);
  const toColumnState = getColumnAnchorState(to, firstColumn?.referencedColumnName);
  const parallelOffset = getParallelOffset(edge, diagram);
  const startY = getNodeSafeY(from, getEdgeAnchorY(edge, from, diagram, effectiveMode, focusKey), parallelOffset);
  const endX = fromLeft ? to.x : to.x + to.width;
  const endY = getNodeSafeY(to, getEdgeAnchorY(edge, to, diagram, effectiveMode, focusKey), parallelOffset);
  const gap = Math.abs(endX - startX);
  const midX = (fromLeft ? startX + gap / 2 : startX - gap / 2) + parallelOffset;
  return {
    curve,
    startX,
    startY,
    endX,
    endY,
    midX,
    path: buildConnectorPath({
      curve,
      endX,
      endY,
      midX,
      startX,
      startY,
    }),
    sourceColumnHidden: fromColumnState.isHidden,
    targetColumnHidden: toColumnState.isHidden,
    usesBundling: parallelOffset !== 0,
  };
}
