import { resolveDependencyKey, classifyDependency } from './schemaAnalysis.js';

function normalize(value) {
  return String(value ?? '').toLowerCase().trim();
}

function getObjectLabel(key) {
  return key?.replace(/^dbo\./, '') ?? '';
}

function formatColumns(columns, sourceName, targetName) {
  return (columns ?? [])
    .map((column) => `${column[sourceName]} -> ${column[targetName]}`)
    .join(', ');
}

function formatColumnList(columns, columnName) {
  return (columns ?? [])
    .map((column) => column[columnName])
    .filter(Boolean)
    .join(', ');
}

function getObjectTypeLabel(type) {
  return {
    table: 'Table',
    view: 'View',
    routine: 'Routine',
    trigger: 'Trigger',
  }[type] ?? 'Object';
}

function addAlias(aliasMap, alias, key) {
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias || !key) {
    return;
  }

  const existingKey = aliasMap.get(normalizedAlias);
  aliasMap.set(normalizedAlias, aliasMap.has(normalizedAlias) && existingKey !== key ? null : key);
}

function buildObjectAliasMap(nodes) {
  const aliases = new Map();
  nodes.forEach((node, key) => {
    addAlias(aliases, key, key);
    addAlias(aliases, node.name, key);
    addAlias(aliases, node.label, key);
    addAlias(aliases, getObjectLabel(key), key);
    addAlias(aliases, node.schemaName && node.name ? `${node.schemaName}.${node.name}` : '', key);
    if (node.source?.parentObjectKey && !node.name.includes('.')) {
      const parent = node.source.parentObjectKey;
      addAlias(aliases, `${node.schemaName ?? parent.slice(0, parent.lastIndexOf('.'))}.${node.name}`, key);
    }
  });
  return aliases;
}

export function buildDatabaseDiagram(
  version,
  query,
  edgeType,
  focusKey,
  mode,
  depth,
  objectTypeFilters = {},
  options = {},
) {
  const nodes = new Map();
  const tableByKey = new Map((version.source.tables ?? []).map((table) => [table.key, table]));
  const addNode = (key, type, label = getObjectLabel(key), object = {}) => {
    if (!key || nodes.has(key)) {
      return;
    }
    const table = tableByKey.get(key);
    const primaryKeyColumns = new Set(
      (table?.keys ?? [])
        .filter((keyItem) => keyItem.type === 'PK' || keyItem.typeDescription?.toLowerCase().includes('primary'))
        .flatMap((keyItem) => keyItem.columns?.map((column) => column.columnName) ?? []),
    );
    nodes.set(key, {
      key,
      type,
      label,
      name: object.name ?? label,
      schemaName: object.schemaName,
      source: object,
      columns: table?.columns?.map((column) => ({
        name: column.name,
        dataType: column.typeDefinition ?? column.dataType,
        isPrimaryKey: primaryKeyColumns.has(column.name),
      })) ?? [],
    });
  };

  version.source.tables.forEach((table) => addNode(table.key, 'table', getObjectLabel(table.key), table));
  if (edgeType !== 'foreignKey') {
    (version.source.views ?? []).forEach((view) => addNode(view.key, 'view', getObjectLabel(view.key), view));
    (version.source.routines ?? []).forEach((routine) =>
      addNode(routine.key, 'routine', getObjectLabel(routine.key), routine),
    );
    (version.source.triggers ?? []).forEach((trigger) =>
      addNode(trigger.name, 'trigger', trigger.name, trigger),
    );
  }
  const objectAliases = buildObjectAliasMap(nodes);

  const edges = [];
  const unresolvedDependencies = [];
  if (edgeType === 'all' || edgeType === 'foreignKey') {
    (version.source.foreignKeys ?? []).forEach((foreignKey) => {
      if (nodes.has(foreignKey.sourceTableKey) && nodes.has(foreignKey.referencedTableKey)) {
        edges.push({
          id: `fk:${foreignKey.name}:${foreignKey.sourceTableKey}:${foreignKey.referencedTableKey}`,
          type: 'foreignKey',
          from: foreignKey.sourceTableKey,
          to: foreignKey.referencedTableKey,
          label: foreignKey.name,
          deleteAction: foreignKey.deleteAction,
          updateAction: foreignKey.updateAction,
          columns: foreignKey.columns ?? [],
          columnSummary: formatColumns(foreignKey.columns, 'sourceColumnName', 'referencedColumnName'),
          sourceColumnSummary: formatColumnList(foreignKey.columns, 'sourceColumnName'),
          targetColumnSummary: formatColumnList(foreignKey.columns, 'referencedColumnName'),
          confidence: 'confirmed',
          status: 'Exported SQL foreign key constraint',
          fromCardinality: 'many',
          toCardinality: 'one',
        });
      }
    });
  }

  if (edgeType === 'all' || edgeType === 'dependency') {
    (version.source.dependencies ?? []).forEach((dependency, index) => {
      const fromKey = resolveDependencyKey(dependency, 'referencing', objectAliases);
      const toKey = resolveDependencyKey(dependency, 'referenced', objectAliases);
      if (nodes.has(fromKey) && nodes.has(toKey)) {
        edges.push({
          id: `dep:${index}:${fromKey}:${toKey}`,
          type: 'dependency',
          from: fromKey,
          to: toKey,
          label: `${getObjectLabel(fromKey)} depends on ${getObjectLabel(toKey)}`,
          referencingType: dependency.referencingObjectTypeDescription,
          referencedType: dependency.referencedObjectTypeDescription,
          confidence: 'inferred',
          status: 'Resolved SQL expression dependency',
        });
      } else {
        const classification = classifyDependency(dependency);
        if ((!fromKey && classification.constraint && toKey) || (fromKey && classification.pseudoTable)) return;
        unresolvedDependencies.push({
          id: `dep:${index}:unresolved`,
          referencingObjectKey: dependency.referencingObjectKey,
          referencedObjectKey: dependency.referencedObjectKey,
          referencingObjectTypeDescription: dependency.referencingObjectTypeDescription,
          referencedObjectTypeDescription: dependency.referencedObjectTypeDescription,
          status: !fromKey && !toKey
            ? 'Referencing and referenced objects were not exported'
            : !fromKey
              ? 'Referencing object was not exported'
              : 'Referenced object was not exported',
        });
      }
    });
  }

  const needle = normalize(query);
  let visibleKeys = new Set(nodes.keys());
  const enabledObjectTypes = {
    table: objectTypeFilters.table !== false,
    view: objectTypeFilters.view !== false,
    routine: objectTypeFilters.routine !== false,
    trigger: objectTypeFilters.trigger !== false,
  };
  if (needle) {
    visibleKeys = new Set();
    nodes.forEach((node) => {
      if (normalize(`${node.key} ${node.label} ${node.type}`).includes(needle)) {
        visibleKeys.add(node.key);
      }
    });
    edges.forEach((edge) => {
      if (visibleKeys.has(edge.from) || visibleKeys.has(edge.to)) {
        visibleKeys.add(edge.from);
        visibleKeys.add(edge.to);
      }
    });
  }

  const connectionDepth = Number(depth) === 2 ? 2 : 1;
  const connectedKeys = new Set();
  const focusedEdgeIds = new Set();
  const focusedEdgeHopById = new Map();
  const focusedParentByKey = new Map();
  if (focusKey && nodes.has(focusKey)) {
    connectedKeys.add(focusKey);
    let frontier = new Set([focusKey]);
    for (let hop = 0; hop < connectionDepth; hop += 1) {
      const nextFrontier = new Set();
      const previouslyConnectedKeys = new Set(connectedKeys);
      edges.forEach((edge) => {
        if (frontier.has(edge.from) || frontier.has(edge.to)) {
          const parentKey = frontier.has(edge.from) ? edge.from : edge.to;
          const childKey = parentKey === edge.from ? edge.to : edge.from;
          const fromWasConnected = previouslyConnectedKeys.has(edge.from);
          const toWasConnected = previouslyConnectedKeys.has(edge.to);
          if (fromWasConnected && toWasConnected) {
            return;
          }

          focusedEdgeIds.add(edge.id);
          focusedEdgeHopById.set(edge.id, hop + 1);
          if (!previouslyConnectedKeys.has(edge.from)) {
            nextFrontier.add(edge.from);
            focusedParentByKey.set(edge.from, parentKey);
          }
          if (!previouslyConnectedKeys.has(edge.to)) {
            nextFrontier.add(edge.to);
            focusedParentByKey.set(edge.to, parentKey);
          }
          if (!previouslyConnectedKeys.has(childKey)) {
            focusedParentByKey.set(childKey, parentKey);
          }
          connectedKeys.add(edge.from);
          connectedKeys.add(edge.to);
        }
      });
      frontier = nextFrontier;
    }
  }

  if (mode === 'focused' && connectedKeys.size > 0) {
    visibleKeys = new Set([...visibleKeys].filter((key) => connectedKeys.has(key)));
  }
  visibleKeys = new Set(
    [...visibleKeys].filter((key) => {
      const node = nodes.get(key);
      return key === focusKey || enabledObjectTypes[node?.type] !== false;
    }),
  );
  if (mode === 'full' && options.connectedOnly) {
    const connectedVisibleKeys = new Set();
    edges.forEach((edge) => {
      if (visibleKeys.has(edge.from) && visibleKeys.has(edge.to)) {
        connectedVisibleKeys.add(edge.from);
        connectedVisibleKeys.add(edge.to);
      }
    });
    visibleKeys = connectedVisibleKeys;
  }

  const groupOrder = ['table', 'view', 'routine', 'trigger'];
  const groupLabels = {
    table: 'Tables',
    view: 'Views',
    routine: 'Routines',
    trigger: 'Triggers',
  };
  let visibleNodes = [...nodes.values()]
    .filter((node) => visibleKeys.has(node.key))
    .sort((left, right) => {
      if (left.type !== right.type) {
        return groupOrder.indexOf(left.type) - groupOrder.indexOf(right.type);
      }
      return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
    });
  const canvasPadding = 34;
  const nodeWidth = 250;
  const tableHeight = 208;
  const objectHeight = 72;
  const columnGap = 84;
  const rowGap = 64;
  const focusedObjectRowGap = 28;
  const columnsPerRow = mode === 'focused' ? 3 : 4;
  const getNodeHeight = (node) => (node.type === 'table' ? tableHeight : objectHeight);
  const getFocusedRowGap = (node) => (node.type === 'table' ? rowGap : focusedObjectRowGap);

  let visibleEdges = edges.filter((edge) => visibleKeys.has(edge.from) && visibleKeys.has(edge.to));
  if (mode === 'focused') {
    visibleEdges = focusKey ? visibleEdges.filter((edge) => focusedEdgeIds.has(edge.id)) : [];
  }
  if (focusKey && options.dependencyDirection && options.dependencyDirection !== 'both') {
    visibleEdges = visibleEdges.filter((edge) => {
      if (edge.type !== 'dependency') {
        return true;
      }
      if (options.dependencyDirection === 'references') {
        return edge.from === focusKey;
      }
      if (options.dependencyDirection === 'referencedBy') {
        return edge.to === focusKey;
      }
      return true;
    });
  }
  if (mode === 'focused') {
    visibleEdges = visibleEdges.map((edge) => ({
      ...edge,
      hop: focusedEdgeHopById.get(edge.id) ?? 1,
    }));
  }

  const incomingEdges = focusKey ? visibleEdges.filter((edge) => edge.to === focusKey) : [];
  const outgoingEdges = focusKey ? visibleEdges.filter((edge) => edge.from === focusKey) : [];
  const relationshipDetails = [...incomingEdges, ...outgoingEdges].map((edge) => ({
    ...edge,
    direction: edge.from === focusKey
      ? (edge.type === 'dependency' ? 'depends on' : 'references')
      : (edge.type === 'dependency' ? 'depended on by' : 'referenced by'),
    otherTableKey: edge.from === focusKey ? edge.to : edge.from,
    otherTableLabel: getObjectLabel(edge.from === focusKey ? edge.to : edge.from),
    fromType: nodes.get(edge.from)?.type,
    toType: nodes.get(edge.to)?.type,
    fromTypeLabel: getObjectTypeLabel(nodes.get(edge.from)?.type),
    toTypeLabel: getObjectTypeLabel(nodes.get(edge.to)?.type),
  }));

  let positionedNodes;
  if (mode === 'focused' && focusKey && nodes.has(focusKey)) {
    const incomingKeys = [...new Set(incomingEdges.map((edge) => edge.from))];
    const outgoingKeys = [...new Set(outgoingEdges.map((edge) => edge.to))];
    const relatedKeys = [...new Set([...incomingKeys, ...outgoingKeys])];
    const extraKeys = [...visibleKeys].filter(
      (key) => key !== focusKey && !relatedKeys.includes(key),
    );
    const extrasByParent = new Map(relatedKeys.map((key) => [key, []]));
    const ungroupedExtras = [];
    extraKeys.forEach((key) => {
      const parentKey = focusedParentByKey.get(key);
      if (extrasByParent.has(parentKey)) {
        extrasByParent.get(parentKey).push(key);
      } else {
        ungroupedExtras.push(key);
      }
    });
    extrasByParent.forEach((keys) =>
      keys.sort((left, right) =>
        nodes.get(left).label.localeCompare(nodes.get(right).label, undefined, { sensitivity: 'base' }),
      ),
    );
    ungroupedExtras.sort((left, right) =>
      nodes.get(left).label.localeCompare(nodes.get(right).label, undefined, { sensitivity: 'base' }),
    );

    const positioned = [
      {
        ...nodes.get(focusKey),
        lane: 'Focused',
        x: canvasPadding,
        y: canvasPadding,
        width: nodeWidth,
        height: tableHeight,
      },
    ];
    const relatedYByKey = new Map();
    let relatedY = canvasPadding;
    relatedKeys
      .map((key) => nodes.get(key))
      .filter(Boolean)
      .forEach((node) => {
        const height = getNodeHeight(node);
        relatedYByKey.set(node.key, relatedY);
        positioned.push({
          ...node,
          lane: 'Related',
          x: canvasPadding + nodeWidth + columnGap,
          y: relatedY,
          width: nodeWidth,
          height,
        });
        relatedY += height + getFocusedRowGap(node);
      });

    let branchY = canvasPadding;
    relatedKeys
      .map((key) => nodes.get(key))
      .filter(Boolean)
      .forEach((node) => {
        const childKeys = extrasByParent.get(node.key) ?? [];
        const childStartY = relatedYByKey.get(node.key) ?? branchY;
        let childY = childStartY;
        childKeys
          .map((key) => nodes.get(key))
          .filter(Boolean)
          .forEach((childNode) => {
            const height = getNodeHeight(childNode);
            positioned.push({
              ...childNode,
              lane: 'Other',
              x: canvasPadding + (nodeWidth + columnGap) * 2,
              y: childY,
              width: nodeWidth,
              height,
            });
            childY += height + getFocusedRowGap(childNode);
          });
        branchY = Math.max(branchY, childY, childStartY + getNodeHeight(node) + getFocusedRowGap(node));
      });
    let ungroupedY = branchY;
    ungroupedExtras
      .map((key) => nodes.get(key))
      .filter(Boolean)
      .forEach((node) => {
        const height = getNodeHeight(node);
        positioned.push({
          ...node,
          lane: 'Other',
          x: canvasPadding + (nodeWidth + columnGap) * 2,
          y: ungroupedY,
          width: nodeWidth,
          height,
        });
        ungroupedY += height + getFocusedRowGap(node);
      });
    positionedNodes = positioned;
  } else {
    positionedNodes = visibleNodes.map((node, index) => {
      const column = index % columnsPerRow;
      const row = Math.floor(index / columnsPerRow);
      const height = getNodeHeight(node);
      return {
        ...node,
        x: canvasPadding + column * (nodeWidth + columnGap),
        y: canvasPadding + row * (tableHeight + rowGap),
        width: nodeWidth,
        height,
      };
    });
  }

  const positionedByKey = new Map(positionedNodes.map((node) => [node.key, node]));
  visibleEdges = visibleEdges.filter((edge) => positionedByKey.has(edge.from) && positionedByKey.has(edge.to));
  const highlightedEdges = new Set(
    visibleEdges
      .filter((edge) => focusKey && (edge.from === focusKey || edge.to === focusKey))
      .map((edge) => edge.id),
  );
  const maxX = Math.max(...positionedNodes.map((node) => node.x + node.width), canvasPadding + nodeWidth);
  const maxY = Math.max(...positionedNodes.map((node) => node.y + node.height), canvasPadding + tableHeight);

  return {
    groupLabels,
    groupOrder,
    width: canvasPadding + maxX,
    height: canvasPadding + maxY,
    nodes: positionedNodes,
    edges: visibleEdges,
    positionedByKey,
    connectedKeys,
    highlightedEdges,
    relationshipDetails,
    unresolvedDependencies,
    unresolvedDependencyCount: unresolvedDependencies.length,
  };
}
