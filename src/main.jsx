import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  Database,
  ExternalLink,
  HelpCircle,
  Lock,
  MessageSquarePlus,
  Search,
  Share2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { appConfig } from './config.js';
import { compareVersions } from './data/schemaDictionary.js';
import { isLocalNoteDifferent, localNotesToVersionNotes } from './data/notes.js';
import {
  getReviewItems,
  getSchemaHealthItems,
  getTableImpactItems,
  getUnresolvedDependencyItems,
} from './data/schemaAnalysis.js';
import {
  comparisonToCsv,
  relationshipsToCsv,
  reviewTablesToCsv,
  tableToCsv,
} from './data/csvExports.js';
import {
  formatCompletenessValue,
  getSnapshotCompletenessRows,
} from './data/schemaCompleteness.js';
import {
  buildGlobalSearchItems,
} from './data/projectInsights.js';
import { buildCatalogProduct, DataLoadError, fetchJson, loadVersionEntry } from './data/productLoader.js';
import { readStorage, writeStorage } from './data/browserStorage.js';
import { isTableNoteMap } from './data/notes.js';
import { downloadText, downloadJson } from './data/downloads.js';
import { readUrlState, writeUrlState } from './data/urlState.js';
import { copyTextToClipboard } from './data/clipboard.js';
import { buildCorrectionIssueUrl } from './data/correctionIssue.js';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { AccessibleModal } from './components/AccessibleModal.jsx';
import { ProductMetadataPanel, formatSnapshotDate } from './components/ProductMetadataPanel.jsx';
import './styles.css';
import './community.css';
import './accessibility.css';
import './system-overlays.css';

const editingBuildEnabled = import.meta.env.VITE_ENABLE_EDITING === 'true';
const emptyTables = [];
const ImportPreviewView = editingBuildEnabled
  ? lazy(() => import('./components/ImportPreviewView.jsx').then((module) => ({ default: module.ImportPreviewView })))
  : null;
const EditingCapabilityGuard = editingBuildEnabled
  ? lazy(() => import('./components/EditingCapabilityGuard.jsx').then((module) => ({ default: module.EditingCapabilityGuard })))
  : null;
const ComparisonDetail = lazy(() => import('./components/ComparisonViews.jsx').then((module) => ({ default: module.ComparisonDetail })));
const ComparisonSummary = lazy(() => import('./components/ComparisonViews.jsx').then((module) => ({ default: module.ComparisonSummary })));
const DatabaseDiagram = lazy(() => import('./components/DatabaseDiagram.jsx').then((module) => ({ default: module.DatabaseDiagram })));
const DependencyReportView = lazy(() => import('./components/DependencyReportView.jsx').then((module) => ({ default: module.DependencyReportView })));
const ImpactView = lazy(() => import('./components/ImpactView.jsx').then((module) => ({ default: module.ImpactView })));
const ObjectExplorer = lazy(() => import('./components/ObjectExplorer.jsx').then((module) => ({ default: module.ObjectExplorer })));
const ReportingGuide = lazy(() => import('./components/ReportingGuide.jsx').then((module) => ({ default: module.ReportingGuide })));
const SchemaHealthView = lazy(() => import('./components/SchemaHealthView.jsx').then((module) => ({ default: module.SchemaHealthView })));
const TableWorkspace = lazy(() => import('./components/TableWorkspace.jsx').then((module) => ({ default: module.TableWorkspace })));

function normalize(value) {
  return String(value ?? '').toLowerCase().trim();
}

function readLocalNotes() {
  return readStorage('lfdd.localNotes', {}, (value) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every(isTableNoteMap));
}

function writeLocalNotes(notes) {
  return writeStorage('lfdd.localNotes', notes);
}

function readUiPreferences() {
  return readStorage('lfdd.uiPreferences.v1', {}, (value) => value !== null && typeof value === 'object'
    && !Array.isArray(value) && Object.values(value).every((item) => typeof item === 'string'));
}

function readJsonStorage(key, fallback) {
  return readStorage(key, fallback, (value) => Array.isArray(value)
    && value.every((item) => key.includes('favoriteObjects') ? typeof item === 'string'
      : item !== null && typeof item === 'object' && typeof item.id === 'string' && typeof item.label === 'string'
        && typeof item.diagramMode === 'string' && typeof item.diagramEdges === 'string'
        && Number.isFinite(item.diagramDepth) && Number.isFinite(item.diagramZoom)));
}

function writeUiPreferences(preferences) {
  writeStorage('lfdd.uiPreferences.v1', preferences);
}

function markdownEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\r\n', '\n');
}

function tableToMarkdown(table, productName, selectedVersion, relationships) {
  const lines = [
    `# ${table.name}`,
    '',
    `Product: ${productName}`,
    `Version: ${selectedVersion}`,
    `Confidence: ${table.confidence}`,
    '',
    '## Summary',
    '',
    table.summary,
    '',
    '## Read-only Guidance',
    '',
    ...table.safeReportingNotes.map((note) => `- ${note}`),
    '',
    '## Warnings',
    '',
    ...table.warnings.map((warning) => `- ${warning}`),
    '',
    '## Columns',
    '',
    '| Column | Type | Nullable | Confidence | Purpose |',
    '| --- | --- | --- | --- | --- |',
    ...table.columns.map((column) =>
      `| ${markdownEscape(column.name)} | ${markdownEscape(column.dataType)} | ${column.nullable ? 'Yes' : 'No'} | ${markdownEscape(column.confidence)} | ${markdownEscape(column.purpose)} |`),
    '',
    '## Relationships',
    '',
    '| Direction | Related table | Confidence | Note |',
    '| --- | --- | --- | --- |',
    ...(relationships.length > 0
      ? relationships.map((relationship) =>
        `| ${markdownEscape(relationship.type)} | ${markdownEscape(relationship.table)} | ${markdownEscape(relationship.confidence)} | ${markdownEscape(relationship.note)} |`)
      : ['| None |  |  | No exported SQL foreign keys for this table. |']),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function versionSummaryToMarkdown(productName, version) {
  const source = version.source ?? {};
  const totalColumns = version.tables.reduce((total, table) => total + table.columns.length, 0);
  const totalRelationships = version.tables.reduce((total, table) => total + table.relationships.length, 0);
  const rows = getSnapshotCompletenessRows(version);
  const lines = [
    `# ${productName} ${version.version}`,
    '',
    '## Product/version metadata',
    '',
    `- Exported: ${formatSnapshotDate(version.exportedAtUtc)}`,
    `- Export format: ${formatCompletenessValue(source.exportFormatVersion)}`,
    `- Database role: ${formatCompletenessValue(source.databaseRole)}`,
    `- Tables: ${version.tables.length}`,
    `- Columns: ${totalColumns}`,
    `- Relationships: ${totalRelationships}`,
    '',
    '## Coverage',
    '',
    '| Area | Count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${markdownEscape(row.label)} | ${markdownEscape(row.value)} |`),
    '',
    '## Tables',
    '',
    '| Table | Columns | Relationships | Confidence | Notes |',
    '| --- | ---: | ---: | --- | --- |',
    ...version.tables.map((table) =>
      `| ${markdownEscape(table.id)} | ${table.columns.length} | ${table.relationships.length} | ${markdownEscape(table.confidence)} | ${table.hasManualNotes ? 'Manual notes' : 'Pending'} |`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}


function getInitialDiagramEdgeType(value) {
  return ['all', 'foreignKey', 'dependency'].includes(value) ? value : 'foreignKey';
}

function getInitialDiagramMode(value) {
  return ['full', 'focused'].includes(value) ? value : 'full';
}

function getInitialDiagramDepth(value) {
  return Number(value) === 2 ? 2 : 1;
}

function getInitialDiagramZoom(value) {
  const numericValue = Number(value);
  return [0.75, 1, 1.25, 1.5].includes(numericValue) ? numericValue : 1;
}

function getInitialDiagramSecondHop(value) {
  return value !== 'hidden';
}

function getInitialBooleanToggle(value) {
  return value === 'true';
}

const diagramObjectTypes = ['table', 'view', 'routine', 'trigger'];

function getInitialDiagramObjectTypes(value) {
  const selectedTypes = new Set(
    String(value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => diagramObjectTypes.includes(item)),
  );

  return diagramObjectTypes.reduce((filters, type) => {
    filters[type] = type === 'table' || selectedTypes.size === 0 || selectedTypes.has(type);
    return filters;
  }, {});
}

function serializeDiagramObjectTypes(filters) {
  const selectedTypes = diagramObjectTypes.filter((type) => filters[type]);
  return selectedTypes.length === diagramObjectTypes.length ? '' : selectedTypes.join(',');
}

function getDocumentationCoverage(tables) {
  const counts = {
    confirmed: 0,
    observed: 0,
    inferred: 0,
    unknown: 0,
    deprecated: 0,
    do_not_rely_on: 0,
    manual: 0,
  };
  tables.forEach((table) => {
    counts[table.confidence] = (counts[table.confidence] ?? 0) + 1;
    if (table.hasManualNotes) {
      counts.manual += 1;
    }
  });
  return counts;
}

function App() {
  const editingEnabled = appConfig.editingEnabled;
  const [initialUrlState] = useState(() => readUrlState());
  const [initialPreferences] = useState(readUiPreferences);
  const preferredProductKey = initialUrlState.product || initialPreferences.product || 'forms';
  const preferredVersion = initialUrlState.version || initialPreferences.version || '';
  const preferredView = initialUrlState.view || initialPreferences.view || 'tables';
  const [product, setProduct] = useState(null);
  const [activeProductManifest, setActiveProductManifest] = useState(null);
  const [productsManifest, setProductsManifest] = useState(null);
  const [selectedProductKey, setSelectedProductKey] = useState(preferredProductKey);
  const [loadError, setLoadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [dataWarnings, setDataWarnings] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(preferredVersion);
  const [selectedTableId, setSelectedTableId] = useState(initialUrlState.table);
  const [query, setQuery] = useState(initialUrlState.q);
  const [tableConfidenceFilter, setTableConfidenceFilter] = useState(initialUrlState.confidence || 'all');
  const [tableNotesFilter, setTableNotesFilter] = useState(initialUrlState.notes || 'all');
  const [relationshipFilter, setRelationshipFilter] = useState('all');
  const [activeView, setActiveView] = useState(preferredView);
  const [objectType, setObjectType] = useState(initialUrlState.objectType || 'views');
  const [selectedObjectKey, setSelectedObjectKey] = useState(initialUrlState.object);
  const [comparisonFromVersion, setComparisonFromVersion] = useState(initialUrlState.from);
  const [comparisonToVersion, setComparisonToVersion] = useState(initialUrlState.to);
  const [diagramQuery, setDiagramQuery] = useState(initialUrlState.diagramQuery);
  const [diagramEdgeType, setDiagramEdgeType] = useState(
    getInitialDiagramEdgeType(initialUrlState.diagramEdges || initialPreferences.diagramEdges),
  );
  const [diagramFocusKey, setDiagramFocusKey] = useState(initialUrlState.diagramFocus);
  const [diagramMode, setDiagramMode] = useState(
    getInitialDiagramMode(initialUrlState.diagramMode || initialPreferences.diagramMode),
  );
  const [diagramDepth, setDiagramDepth] = useState(
    getInitialDiagramDepth(initialUrlState.diagramDepth || initialPreferences.diagramDepth),
  );
  const [diagramZoom, setDiagramZoom] = useState(
    getInitialDiagramZoom(initialUrlState.diagramZoom || initialPreferences.diagramZoom),
  );
  const [diagramObjectTypeFilters, setDiagramObjectTypeFilters] = useState(() =>
    getInitialDiagramObjectTypes(initialUrlState.diagramTypes || initialPreferences.diagramTypes),
  );
  const [showDiagramSecondHopEdges, setShowDiagramSecondHopEdges] = useState(() =>
    getInitialDiagramSecondHop(initialUrlState.diagramSecondHop || initialPreferences.diagramSecondHop),
  );
  const [diagramConnectedOnly, setDiagramConnectedOnly] = useState(() =>
    getInitialBooleanToggle(initialUrlState.diagramConnectedOnly || initialPreferences.diagramConnectedOnly),
  );
  const [selectedReportingView, setSelectedReportingView] = useState(
    initialUrlState.reporting || initialPreferences.reporting || 'overview',
  );
  const [selectedChangedTableKey, setSelectedChangedTableKey] = useState('');
  const [columnUsageQuery, setColumnUsageQuery] = useState(initialUrlState.objectQuery);
  const [localNotes, setLocalNotes] = useState(readLocalNotes);
  const [editingWarningAccepted, setEditingWarningAccepted] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [favoriteObjects, setFavoriteObjects] = useState(() => readJsonStorage('lfdd.favoriteObjects.v1', []));
  const [diagramPresets, setDiagramPresets] = useState(() => readJsonStorage('lfdd.diagramPresets.v1', []));
  const loadedVersionEntriesRef = useRef(new Map());
  const productLoadRequestRef = useRef(0);
  const versionSelectionRequestRef = useRef(0);
  const activeProductManifestRef = useRef(null);
  const historyReadyRef = useRef(false);
  const previousNavigationKeyRef = useRef('');
  const restoringHistoryRef = useRef(false);
  const canEditNotes = editingEnabled && editingWarningAccepted;
  const canUseImport = canEditNotes;

  useEffect(() => {
    activeProductManifestRef.current = activeProductManifest;
  }, [activeProductManifest]);

  useEffect(() => {
    let isCurrent = true;
    const requestId = productLoadRequestRef.current + 1;
    productLoadRequestRef.current = requestId;

    async function loadProduct(selectedProduct, products) {
      const manifest = await fetchJson(selectedProduct.manifestUrl, { refresh: true }).catch((error) => {
        throw new DataLoadError(`Unable to load ${selectedProduct.productName ?? selectedProduct.productKey} versions.`, [
          selectedProduct.manifestUrl,
          error.message,
          ...(error.details ?? []),
        ]);
      });
      if (!Array.isArray(manifest.versions) || manifest.versions.length === 0) {
        throw new DataLoadError(`Product manifest has no versions: ${selectedProduct.manifestUrl}`, [
          'Add at least one version entry with schemaUrl and notesUrl.',
        ]);
      }

      const urlVersion = manifest.versions.some((version) => version.version === preferredVersion)
        ? preferredVersion
        : manifest.defaultVersion;
      const selectedVersionEntry = manifest.versions.find((version) => version.version === urlVersion);
      if (!selectedVersionEntry) {
        throw new DataLoadError(`Product manifest default version is invalid: ${urlVersion}`);
      }
      const selectedEntry = await loadVersionEntry(selectedVersionEntry, manifest.productKey);

      if (!isCurrent || requestId !== productLoadRequestRef.current) {
        return;
      }

      const loadedEntries = new Map([[urlVersion, { schema: selectedEntry.schema, notes: selectedEntry.notes }]]);
      loadedVersionEntriesRef.current = loadedEntries;
      setProductsManifest(products);
      setActiveProductManifest(manifest);
      setSelectedProductKey(selectedProduct.productKey);
      const loadedProduct = buildCatalogProduct(manifest, [...loadedEntries.values()]);
      setProduct(loadedProduct);
      setDataWarnings(selectedEntry.warning ? [selectedEntry.warning] : []);
      const urlFromVersion = manifest.versions.some((version) => version.version === initialUrlState.from)
        ? initialUrlState.from
        : manifest.versions[0]?.version ?? urlVersion;
      const urlToVersion = manifest.versions.some((version) => version.version === initialUrlState.to)
        ? initialUrlState.to
        : urlVersion;
      setSelectedVersion(urlVersion);
      setComparisonFromVersion(urlFromVersion);
      setComparisonToVersion(urlToVersion);
      setDiagramEdgeType(getInitialDiagramEdgeType(initialUrlState.diagramEdges || initialPreferences.diagramEdges));
      setDiagramMode(getInitialDiagramMode(initialUrlState.diagramMode || initialPreferences.diagramMode));
      setDiagramDepth(getInitialDiagramDepth(initialUrlState.diagramDepth || initialPreferences.diagramDepth));
      setDiagramZoom(getInitialDiagramZoom(initialUrlState.diagramZoom || initialPreferences.diagramZoom));
      setDiagramObjectTypeFilters(
        getInitialDiagramObjectTypes(initialUrlState.diagramTypes || initialPreferences.diagramTypes),
      );
      setShowDiagramSecondHopEdges(
        getInitialDiagramSecondHop(initialUrlState.diagramSecondHop || initialPreferences.diagramSecondHop),
      );
      setDiagramConnectedOnly(
        getInitialBooleanToggle(initialUrlState.diagramConnectedOnly || initialPreferences.diagramConnectedOnly),
      );
      const defaultTables =
        loadedProduct.versions.find((item) => item.version === urlVersion)?.tables ?? [];
      setSelectedTableId(
        defaultTables.some((table) => table.id === initialUrlState.table)
          ? initialUrlState.table
          : defaultTables[0]?.id ?? '',
      );
      setDiagramFocusKey(initialUrlState.diagramFocus);

    }

    async function loadDefaultProduct() {
      try {
        const products = await fetchJson('/data/products.json', { refresh: true }).catch(() => ({
          defaultProduct: 'forms',
          products: [
            {
              productKey: 'forms',
              productName: 'Forms',
              manifestUrl: '/data/forms/versions.json',
              status: 'available',
            },
          ],
        }));
        const selectedProduct =
          products.products.find((item) => item.productKey === preferredProductKey) ??
          products.products.find((item) => item.productKey === products.defaultProduct) ??
          products.products[0];
        await loadProduct(selectedProduct, products);
      } catch (error) {
        if (isCurrent) {
          setLoadError(error);
        }
      }
    }

    loadDefaultProduct();
    return () => {
      isCurrent = false;
    };
    // Product bootstrap intentionally runs once; later product changes use handleProductChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const version = product?.versions.find((item) => item.version === selectedVersion) ?? product?.versions[0];
  const productName = product?.name ?? 'Product';
  const localNotesKey = `${selectedProductKey}:${selectedVersion}`;
  const localNotesForVersion = editingEnabled ? localNotes[localNotesKey] ?? {} : {};
  const tables = version?.tables ?? emptyTables;

  const ensureVersionsLoaded = useCallback(async (versionNames) => {
    if (!activeProductManifest) {
      return null;
    }
    const requestedManifest = activeProductManifest;
    const requestedProductLoad = productLoadRequestRef.current;
    const missingEntries = [...new Set(versionNames)]
      .filter((versionName) => !loadedVersionEntriesRef.current.has(versionName))
      .map((versionName) => requestedManifest.versions.find((item) => item.version === versionName))
      .filter(Boolean);
    if (missingEntries.length === 0) {
      return buildCatalogProduct(requestedManifest, [...loadedVersionEntriesRef.current.values()]);
    }
    setOperationError('');
    const results = await Promise.allSettled(missingEntries.map(async (entry) => [entry.version, await loadVersionEntry(entry, requestedManifest.productKey)]));
    if (requestedManifest !== activeProductManifestRef.current || requestedProductLoad !== productLoadRequestRef.current) {
      return null;
    }
    const failures = [];
    const warnings = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const [loadedVersion, entry] = result.value;
        loadedVersionEntriesRef.current.set(loadedVersion, { schema: entry.schema, notes: entry.notes });
        if (entry.warning) warnings.push(entry.warning);
      } else {
        failures.push(`${missingEntries[index].version}: ${result.reason.message}`);
      }
    });
    if (warnings.length > 0) {
      setDataWarnings((current) => [...new Set([...current, ...warnings])]);
    }
    if (failures.length > 0) {
      setOperationError(`Some version metadata could not be loaded. ${failures.join(' ')}`);
    }
    const nextProduct = buildCatalogProduct(requestedManifest, [...loadedVersionEntriesRef.current.values()]);
    setProduct(nextProduct);
    return nextProduct;
  }, [activeProductManifest]);

  useEffect(() => {
    if (activeView === 'compare' && comparisonFromVersion && comparisonToVersion) {
      ensureVersionsLoaded([comparisonFromVersion, comparisonToVersion]);
    }
  }, [activeView, comparisonFromVersion, comparisonToVersion, ensureVersionsLoaded]);

  useEffect(() => {
    if (!product || !selectedVersion || restoringHistoryRef.current) {
      return;
    }

    const navigationKey = [
      selectedProductKey,
      selectedVersion,
      activeView,
      selectedTableId,
      selectedReportingView,
      comparisonFromVersion,
      comparisonToVersion,
      objectType,
      selectedObjectKey,
      diagramFocusKey,
    ].join('|');
    const shouldPush = historyReadyRef.current && previousNavigationKeyRef.current !== navigationKey;
    writeUrlState({
      product: selectedProductKey,
      version: selectedVersion,
      view: activeView,
      table: selectedTableId,
      q: query,
      confidence: tableConfidenceFilter === 'all' ? '' : tableConfidenceFilter,
      notes: tableNotesFilter === 'all' ? '' : tableNotesFilter,
      from: comparisonFromVersion,
      to: comparisonToVersion,
      objectType,
      object: selectedObjectKey,
      objectQuery: columnUsageQuery,
      diagramFocus: diagramFocusKey,
      diagramQuery,
      diagramMode,
      diagramEdges: diagramEdgeType,
      diagramDepth: String(diagramDepth),
      diagramZoom: String(diagramZoom),
      diagramTypes: serializeDiagramObjectTypes(diagramObjectTypeFilters),
      diagramSecondHop: showDiagramSecondHopEdges ? '' : 'hidden',
      diagramConnectedOnly: diagramConnectedOnly ? 'true' : '',
      reporting: selectedReportingView === 'overview' ? '' : selectedReportingView,
    }, { mode: shouldPush ? 'push' : 'replace' });
    previousNavigationKeyRef.current = navigationKey;
    historyReadyRef.current = true;
    writeUiPreferences({
      product: selectedProductKey,
      version: selectedVersion,
      view: activeView,
      q: query,
      confidence: tableConfidenceFilter,
      notes: tableNotesFilter,
      objectType,
      objectQuery: columnUsageQuery,
      diagramQuery,
      diagramMode,
      diagramEdges: diagramEdgeType,
      diagramDepth: String(diagramDepth),
      diagramZoom: String(diagramZoom),
      diagramTypes: serializeDiagramObjectTypes(diagramObjectTypeFilters),
      diagramSecondHop: showDiagramSecondHopEdges ? '' : 'hidden',
      diagramConnectedOnly: diagramConnectedOnly ? 'true' : '',
      reporting: selectedReportingView,
    });
  }, [
    activeView,
    columnUsageQuery,
    comparisonFromVersion,
    comparisonToVersion,
    diagramDepth,
    diagramEdgeType,
    diagramFocusKey,
    diagramMode,
    diagramObjectTypeFilters,
    diagramQuery,
    diagramZoom,
    diagramConnectedOnly,
    objectType,
    selectedObjectKey,
    product,
    query,
    selectedProductKey,
    selectedReportingView,
    selectedTableId,
    selectedVersion,
    showDiagramSecondHopEdges,
    tableConfidenceFilter,
    tableNotesFilter,
  ]);

  useEffect(() => {
    async function restoreUrlState() {
      if (!productsManifest) return;
      const state = readUrlState();
      const requestId = ++productLoadRequestRef.current;
      ++versionSelectionRequestRef.current;
      restoringHistoryRef.current = true;
      try {
        const selectedProduct = productsManifest.products.find((item) => item.productKey === state.product);
        if (!selectedProduct) throw new Error('The requested product is not available.');
        const manifest = await fetchJson(selectedProduct.manifestUrl);
        const entry = manifest.versions.find((item) => item.version === state.version);
        if (!entry) throw new Error('The requested version is not available.');
        const loaded = await loadVersionEntry(entry, manifest.productKey);
        if (requestId !== productLoadRequestRef.current) return;
        loadedVersionEntriesRef.current = new Map([[entry.version, loaded]]);
        activeProductManifestRef.current = manifest;
        setActiveProductManifest(manifest);
        setProduct(buildCatalogProduct(manifest, [loaded]));
        setSelectedProductKey(manifest.productKey);
        setSelectedVersion(entry.version);
        setSelectedTableId(state.table);
        setActiveView(state.view || 'tables');
        setSelectedReportingView(state.reporting || 'overview');
        setObjectType(state.objectType || 'views');
        setSelectedObjectKey(state.object);
        setColumnUsageQuery(state.objectQuery);
        setQuery(state.q);
        setTableConfidenceFilter(state.confidence || 'all');
        setTableNotesFilter(state.notes || 'all');
        setComparisonFromVersion(state.from);
        setComparisonToVersion(state.to);
        setDiagramFocusKey(state.diagramFocus);
        setDiagramQuery(state.diagramQuery);
        setDiagramMode(getInitialDiagramMode(state.diagramMode));
        setDiagramEdgeType(getInitialDiagramEdgeType(state.diagramEdges));
        setDiagramDepth(getInitialDiagramDepth(state.diagramDepth));
        setDiagramZoom(getInitialDiagramZoom(state.diagramZoom));
        setDiagramObjectTypeFilters(getInitialDiagramObjectTypes(state.diagramTypes));
        setShowDiagramSecondHopEdges(getInitialDiagramSecondHop(state.diagramSecondHop));
        setDiagramConnectedOnly(getInitialBooleanToggle(state.diagramConnectedOnly));
        setDataWarnings(loaded.warning ? [loaded.warning] : []);
        setOperationError('');
        historyReadyRef.current = false;
      } catch (error) {
        if (requestId === productLoadRequestRef.current) setOperationError(`Unable to restore navigation: ${error.message}`);
      } finally {
        if (requestId === productLoadRequestRef.current) restoringHistoryRef.current = false;
      }
    }
    window.addEventListener('popstate', restoreUrlState);
    return () => window.removeEventListener('popstate', restoreUrlState);
  }, [productsManifest]);

  const comparison = useMemo(() => {
    if (!product || product.versions.length < 2) {
      return null;
    }
    const fromVersion = product.versions.find((item) => item.version === comparisonFromVersion);
    const toVersion = product.versions.find((item) => item.version === comparisonToVersion);
    if (!fromVersion?.isLoaded || !toVersion?.isLoaded) {
      return null;
    }
    return compareVersions(fromVersion, toVersion);
  }, [comparisonFromVersion, comparisonToVersion, product]);

  const activeViewLabels = useMemo(() => ([
    ['tables', 'Tables'],
    ['diagram', 'Diagram'],
    ['compare', 'Compare'],
    ['reporting', 'Reporting'],
    ['objects', 'Objects'],
    ['impact', 'Impact'],
    ['health', 'Schema checks'],
    ['dependencies', 'Dependencies'],
    ...(editingEnabled ? [['import', 'Import']] : []),
  ]), [editingEnabled]);

  useEffect(() => {
    if (activeView === 'import' && !editingEnabled) {
      setActiveView('tables');
    }
  }, [activeView, editingEnabled]);

  const commandItems = useMemo(() => {
    if (!version) {
      return [];
    }
    const globalSearchItems = buildGlobalSearchItems(version, tables).map((item) => ({
      ...item,
      action: () => {
        if (item.objectType) {
          setObjectType(item.objectType);
          setSelectedObjectKey(item.label);
          setActiveView('objects');
          return;
        }
        if (item.tableKey) {
          setSelectedTableId(item.tableKey);
          setActiveView('tables');
        }
      },
    }));
    return [
      ...activeViewLabels.map(([value, label]) => ({ type: 'View', label, action: () => setActiveView(value) })),
      ...globalSearchItems,
    ];
  }, [activeViewLabels, tables, version]);

  const filteredCommandItems = useMemo(() => {
    const needle = normalize(commandQuery);
    return commandItems
      .filter((item) => normalize(`${item.type} ${item.label} ${item.searchText ?? ''}`).includes(needle))
      .slice(0, 24);
  }, [commandItems, commandQuery]);

  useEffect(() => {
    function handleKeyboardShortcuts(event) {
      if (commandOpen || shortcutHelpOpen) {
        return;
      }
      const target = event.target;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (event.key === '?' && !isTyping) {
        event.preventDefault();
        setShortcutHelpOpen((current) => !current);
        return;
      }
      if (isTyping) {
        return;
      }
      const numericShortcut = Number(event.key);
      if (numericShortcut >= 1 && numericShortcut <= activeViewLabels.length) {
        event.preventDefault();
        setActiveView(activeViewLabels[numericShortcut - 1][0]);
      }
      if (activeView === 'diagram') {
        if (event.key === '+' || event.key === '=') {
          setDiagramZoom((current) => Math.min(1.5, current + 0.25));
        } else if (event.key === '-') {
          setDiagramZoom((current) => Math.max(0.75, current - 0.25));
        } else if (event.key.toLowerCase() === 'f') {
          setDiagramZoom(1);
        } else if (event.key === 'Escape') {
          setDiagramFocusKey('');
          setDiagramMode('full');
        }
      }
    }
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [activeView, activeViewLabels, commandOpen, shortcutHelpOpen]);

  const documentationCoverage = useMemo(() => getDocumentationCoverage(tables), [tables]);
  const unknownTables = useMemo(() => tables.filter((table) => table.confidence === 'unknown'), [tables]);

  const filteredTables = useMemo(() => {
    const needle = normalize(query);
    return tables.filter((table) => {
      if (tableConfidenceFilter !== 'all' && table.confidence !== tableConfidenceFilter) {
        return false;
      }
      if (tableNotesFilter === 'manual' && !table.hasManualNotes) {
        return false;
      }
      if (tableNotesFilter === 'missing' && table.hasManualNotes) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const columnText = table.columns
        .map((column) => `${column.name} ${column.purpose} ${column.dataType}`)
        .join(' ');
      const relationText = table.relationships.map((relationship) => relationship.table).join(' ');
      const indexText = table.indexes.map((index) => `${index.name} ${index.typeDescription}`).join(' ');
      return normalize(`${table.name} ${table.summary} ${columnText} ${relationText} ${indexText}`).includes(
        needle,
      );
    });
  }, [query, tableConfidenceFilter, tableNotesFilter, tables]);

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) ?? filteredTables[0] ?? tables[0];

  async function handleVersionChange(nextVersion) {
    const requestId = versionSelectionRequestRef.current + 1;
    versionSelectionRequestRef.current = requestId;
    let nextVersionData = product.versions.find((item) => item.version === nextVersion);
    if (!nextVersionData?.isLoaded) {
      const versionEntry = activeProductManifest?.versions.find((item) => item.version === nextVersion);
      if (!versionEntry) {
        return;
      }
      try {
        const nextProduct = await ensureVersionsLoaded([nextVersion]);
        if (!nextProduct || requestId !== versionSelectionRequestRef.current) return;
        nextVersionData = nextProduct.versions.find((item) => item.version === nextVersion);
        if (!nextVersionData?.isLoaded) return;
      } catch (error) {
        if (requestId === versionSelectionRequestRef.current) setOperationError(`Unable to load ${nextVersion}: ${error.message}`);
        return;
      }
    }
    if (requestId !== versionSelectionRequestRef.current) return;
    setSelectedVersion(nextVersion);
    setSelectedTableId(nextVersionData?.tables.some((table) => table.id === selectedTableId)
      ? selectedTableId : nextVersionData?.tables[0]?.id ?? '');
  }

  async function handleProductChange(nextProductKey) {
    const selectedProduct = productsManifest?.products.find((item) => item.productKey === nextProductKey);
    if (!selectedProduct || selectedProduct.status !== 'available') {
      return;
    }

    const requestId = productLoadRequestRef.current + 1;
    productLoadRequestRef.current = requestId;
    try {
      setOperationError('');
      setDataWarnings([]);
      const manifest = await fetchJson(selectedProduct.manifestUrl, { refresh: true });
      const defaultVersionEntry = manifest.versions.find((item) => item.version === manifest.defaultVersion);
      if (!defaultVersionEntry) {
        throw new DataLoadError(`Product manifest default version is invalid: ${manifest.defaultVersion}`);
      }
      const defaultEntry = await loadVersionEntry(defaultVersionEntry, manifest.productKey);
      if (requestId !== productLoadRequestRef.current) {
        return;
      }
      const loadedEntries = new Map([
        [manifest.defaultVersion, { schema: defaultEntry.schema, notes: defaultEntry.notes }],
      ]);
      loadedVersionEntriesRef.current = loadedEntries;
      const loadedProduct = buildCatalogProduct(manifest, [...loadedEntries.values()]);
      setActiveProductManifest(manifest);
      setSelectedProductKey(selectedProduct.productKey);
      setProduct(loadedProduct);
      setDataWarnings(defaultEntry.warning ? [defaultEntry.warning] : []);
      setSelectedVersion(manifest.defaultVersion);
      setComparisonFromVersion(manifest.versions[0]?.version ?? manifest.defaultVersion);
      setComparisonToVersion(manifest.defaultVersion);
      setSelectedTableId(
        loadedProduct.versions.find((item) => item.version === manifest.defaultVersion)?.tables[0]?.id ?? '',
      );
      setQuery('');
      setTableConfidenceFilter('all');
      setTableNotesFilter('all');
      setColumnUsageQuery('');
      setDiagramQuery('');
      setDiagramFocusKey('');
      setActiveView('tables');

    } catch (error) {
      if (requestId === productLoadRequestRef.current) {
        setOperationError(`Unable to change product: ${error.message}`);
      }
    }
  }

  function navigateToTable(tableId) {
    if (tables.some((table) => table.id === tableId)) {
      setSelectedTableId(tableId);
      setActiveView('tables');
      return;
    }

    const target = tableId.includes(' -> ') ? tableId.split(' -> ').find((key) => key !== selectedTableId) : tableId;
    if (target !== tableId && tables.some((table) => table.id === target)) {
      setSelectedTableId(target);
      setActiveView('tables');
      return;
    }
    const type = ['views', 'routines', 'triggers'].find((key) => (version.source[key] ?? []).some((item) => item.key === target));
    if (type) {
      setObjectType(type);
      setSelectedObjectKey(target);
      setActiveView('objects');
      return;
    }
    setOperationError(`No exported details are available for ${target || tableId} in this version.`);
  }

  function toggleFavoriteObject(objectKey) {
    const nextFavorites = favoriteObjects.includes(objectKey)
      ? favoriteObjects.filter((item) => item !== objectKey)
      : [...favoriteObjects, objectKey].slice(-24);
    setFavoriteObjects(nextFavorites);
    if (!writeStorage('lfdd.favoriteObjects.v1', nextFavorites)) setOperationError('Favorites are available for this session but could not be saved in this browser.');
  }

  async function copyCurrentDeepLink(label = 'link') {
    try {
      await copyTextToClipboard(window.location.href);
      setCommandQuery(`Copied ${label}`);
    } catch {
      setCommandQuery(`Unable to copy ${label}`);
    }
    globalThis.setTimeout(() => setCommandQuery(''), 900);
  }

  function saveDiagramPreset() {
    const preset = {
      id: `${Date.now()}`,
      label: `${selectedProductKey} ${selectedVersion} ${diagramFocusKey || 'full diagram'}`,
      product: selectedProductKey,
      version: selectedVersion,
      diagramFocus: diagramFocusKey,
      diagramMode,
      diagramEdges: diagramEdgeType,
      diagramDepth,
      diagramZoom,
      diagramTypes: serializeDiagramObjectTypes(diagramObjectTypeFilters),
      diagramSecondHop: showDiagramSecondHopEdges,
      diagramConnectedOnly,
    };
    const nextPresets = [preset, ...diagramPresets].slice(0, 10);
    setDiagramPresets(nextPresets);
    if (!writeStorage('lfdd.diagramPresets.v1', nextPresets)) setOperationError('Diagram presets are available for this session but could not be saved in this browser.');
  }

  function applyDiagramPreset(presetId) {
    const preset = diagramPresets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    setDiagramFocusKey(preset.diagramFocus);
    setDiagramMode(preset.diagramMode);
    setDiagramEdgeType(preset.diagramEdges);
    setDiagramDepth(preset.diagramDepth);
    setDiagramZoom(preset.diagramZoom);
    setDiagramObjectTypeFilters(getInitialDiagramObjectTypes(preset.diagramTypes));
    setShowDiagramSecondHopEdges(preset.diagramSecondHop);
    setDiagramConnectedOnly(preset.diagramConnectedOnly);
  }

  function saveLocalTableNote(tableKey, note) {
    if (!canEditNotes) {
      return;
    }

    const nextNotes = {
      ...localNotes,
      [localNotesKey]: {
        ...(localNotes[localNotesKey] ?? {}),
        [tableKey]: {
          ...note,
          updatedAtUtc: new Date().toISOString(),
        },
      },
    };
    setLocalNotes(nextNotes);
    if (!writeLocalNotes(nextNotes)) setOperationError('Notes changed for this session but could not be saved in this browser. Export them before leaving.');
  }

  function clearLocalTableNote(tableKey) {
    if (!canEditNotes) {
      return;
    }

    const versionNotes = { ...(localNotes[localNotesKey] ?? {}) };
    delete versionNotes[tableKey];
    const nextNotes = { ...localNotes, [localNotesKey]: versionNotes };
    setLocalNotes(nextNotes);
    if (!writeLocalNotes(nextNotes)) setOperationError('Notes changed for this session but could not be saved in this browser. Export them before leaving.');
  }

  function importLocalNotes(event) {
    if (!canEditNotes) {
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '{}'));
        const importedTables = parsed.tables ?? parsed[localNotesKey] ?? {};
        if (!isTableNoteMap(importedTables)) throw new Error('The notes file contains invalid table documentation.');
        const nextNotes = {
          ...localNotes,
          [localNotesKey]: {
            ...(localNotes[localNotesKey] ?? {}),
            ...importedTables,
          },
        };
        setLocalNotes(nextNotes);
        if (!writeLocalNotes(nextNotes)) setOperationError('Imported notes are available for this session but could not be saved in this browser. Export them before leaving.');
      } catch (error) {
        setOperationError(`Unable to import notes: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  function exportVersionNotes() {
    if (!canEditNotes) {
      return;
    }

    downloadJson(
      `${selectedProductKey}-${selectedVersion}-notes-ready.json`,
      localNotesToVersionNotes(localNotes, localNotesKey, selectedProductKey, selectedVersion),
    );
  }

  if (loadError) {
    return (
      <main className="loading-state">
        <AlertTriangle size={26} />
        <h1>Unable to load schema data</h1>
        <p>{loadError.message}</p>
        {loadError.details?.length > 0 && (
          <ul className="load-error-details">
            {loadError.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  if (!product || !version || !selectedTable) {
    return (
      <main className="loading-state">
        <Database size={26} />
        <h1>FicheBait Schema Reference</h1>
        <p>Loading schema snapshots...</p>
      </main>
    );
  }

  const visibleRelationships = selectedTable.relationships.filter((relationship) => {
    if (relationshipFilter === 'all') {
      return true;
    }
    return relationship.type === relationshipFilter;
  });
  const correctionIssueUrl = buildCorrectionIssueUrl({
    productKey: selectedProductKey,
    productName,
    version: selectedVersion,
    view: activeView,
    objectLabel: activeView === 'tables' ? selectedTable.id : activeView === 'reporting' ? selectedReportingView : activeView === 'objects' ? selectedObjectKey : '',
    currentUrl: window.location.href,
  });

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Product, version, and view navigation">
        <div className="brand">
          <h1>
            <img className="brand-logo" src={`${import.meta.env.BASE_URL}fichebait-schema-reference-logo.svg`} alt="FicheBait Schema Reference" />
          </h1>
          <p>Schema, relationships, and reporting</p>
        </div>

        <section className="sidebar-section">
          <h2>Products</h2>
          <label className="sidebar-select">
            <span>Product</span>
            <select aria-label="Product" value={selectedProductKey} onChange={(event) => handleProductChange(event.target.value)}>
              {(productsManifest?.products ?? []).map((item) => (
                <option
                  disabled={item.status !== 'available'}
                  key={item.productKey}
                  value={item.productKey}
                >
                  {item.productName}
                  {item.status !== 'available' ? ' (planned)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="sidebar-select">
            <span>Version</span>
            <select aria-label="Version" value={selectedVersion} onChange={(event) => handleVersionChange(event.target.value)}>
              {product.versions.map((item) => (
                <option value={item.version} key={item.version}>
                  {item.version}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="sidebar-section">
          <h2>Database views</h2>
          <nav className="sidebar-view-nav" aria-label="Dictionary views">
            {activeViewLabels.slice(0, 4).map(([value, label]) => (
              <button
                className={activeView === value ? 'selected' : ''}
                aria-current={activeView === value ? 'page' : undefined}
                key={value}
                type="button"
                onClick={() => setActiveView(value)}
              >
                {label}
              </button>
            ))}
          </nav>
          <details className="sidebar-diagnostics" open={['objects', 'impact', 'health', 'dependencies', 'import'].includes(activeView)}>
            <summary>Schema tools</summary>
            <nav className="sidebar-view-nav" aria-label="Schema tools">
              {activeViewLabels.slice(4).map(([value, label]) => (
                <button key={value} type="button" className={activeView === value ? 'selected' : ''}
                  aria-current={activeView === value ? 'page' : undefined} onClick={() => setActiveView(value)}>{label}</button>
              ))}
            </nav>
          </details>
        </section>
        <p className="sidebar-trademark">
          Laserfiche is a registered trademark of Laserfiche in the United States and other countries.
        </p>
      </aside>

      <section className="workspace">
        <header className="topbar">
          {editingEnabled && (
            <div className="editing-mode-badge" role="status">
              <Lock size={15} />
              Editing enabled
            </div>
          )}

          <div className="warning-banner topbar-warning" role="note">
            <ShieldAlert size={20} />
            <details className="community-disclaimer">
              <summary>Community research aid. Read-only use; validate changes in a test environment.</summary>
              <p>
              This community research aid documents Laserfiche&reg; product databases for read-only
              reporting, troubleshooting, and education. It is not affiliated with or endorsed by
              Laserfiche. Direct modification of Laserfiche product databases is unsupported; consult
              your applicable license and support agreements. Validate changes in a test environment.
              {' '}
              <a
                className="warning-link"
                href="https://github.com/SilhouetteBS/FicheBaitSchemaReference/blob/main/docs/known-limitations.md"
                rel="noreferrer"
                target="_blank"
              >
                Known limitations
                <ExternalLink aria-hidden="true" size={13} />
              </a>
              </p>
            </details>
          </div>

          <div className="topbar-actions">
            <a
              className="text-button feedback-link"
              href={correctionIssueUrl}
              aria-label="Report a correction or update"
              rel="noreferrer"
              target="_blank"
              title="Report a correction or update"
            >
              <MessageSquarePlus size={14} />
              <span>Report correction</span>
            </a>
            <button className="text-button command-button" type="button" onClick={() => setCommandOpen(true)}>
              <Search size={14} />
              Command
            </button>
            <button className="icon-button" title="Keyboard shortcuts" type="button" onClick={() => setShortcutHelpOpen(true)}>
              <HelpCircle size={16} />
            </button>
            <button className="icon-button" title="Copy current view link" type="button" onClick={() => copyCurrentDeepLink('current view')}>
              <Share2 size={16} />
            </button>
          </div>
        </header>

        {dataWarnings.length > 0 && (
          <div className="data-load-warning" role="status">
            <AlertTriangle size={17} />
            <p>
              {dataWarnings[0]}
              {dataWarnings.length > 1 ? ` ${dataWarnings.length - 1} additional data loading warnings.` : ''}
            </p>
          </div>
        )}

        {operationError && (
          <div className="data-load-warning" role="alert">
            <AlertTriangle size={17} />
            <p>{operationError}</p>
            <button className="icon-button" aria-label="Dismiss loading error" onClick={() => setOperationError('')} type="button">
              <X aria-hidden="true" size={15} />
            </button>
          </div>
        )}

        <ProductMetadataPanel
          product={product}
          productsManifest={productsManifest}
          productName={productName}
          version={version}
          onRequestVersionHistory={() => ensureVersionsLoaded(product.versions.map((item) => item.version))}
          onDownloadMarkdown={() =>
            downloadText(
              `${selectedProductKey}-${selectedVersion}-summary.md`,
              versionSummaryToMarkdown(productName, version),
              'text/markdown',
            )
          }
        />

        {editingEnabled && (
          <div className="editing-warning-banner" role="note">
            <Lock size={18} />
            <div>
              <strong>Local editing mode only</strong>
              <p>
                Notes are saved to this browser's local storage. This does not enable database editing and does not
                make direct Laserfiche database writes supported.
              </p>
              <label>
                <input
                  checked={editingWarningAccepted}
                  onChange={(event) => setEditingWarningAccepted(event.target.checked)}
                  type="checkbox"
                />
                I understand that editing notes is local documentation work only.
              </label>
            </div>
          </div>
        )}

        {activeView === 'compare' && (
          <Suspense fallback={<div className="loading-state-inline">Loading comparison...</div>}>
            <ComparisonSummary
            comparison={comparison}
            versions={product.versions}
            fromVersion={comparisonFromVersion}
            toVersion={comparisonToVersion}
            onFromVersionChange={setComparisonFromVersion}
            onToVersionChange={setComparisonToVersion}
            onOpen={() => setActiveView('compare')}
            onDownloadJson={() => downloadJson(`${selectedProductKey}-version-comparison.json`, comparison)}
            onDownloadCsv={() =>
              downloadText(`${selectedProductKey}-version-comparison.csv`, comparisonToCsv(comparison), 'text/csv')
            }
            />
          </Suspense>
        )}

        <ErrorBoundary key={`${activeView}:${selectedProductKey}:${selectedVersion}`}>
          <Suspense fallback={<div className="loading-state-inline">Loading view...</div>}>
            {activeView === 'compare' ? (
            <ComparisonDetail
              comparison={comparison}
              onSelectTable={navigateToTable}
              selectedTableKey={selectedChangedTableKey}
              onSelectedTableKeyChange={setSelectedChangedTableKey}
            />
          ) : activeView === 'diagram' ? (
            <DatabaseDiagram
              diagramQuery={diagramQuery}
              edgeType={diagramEdgeType}
              focusKey={diagramFocusKey}
              mode={diagramMode}
              depth={diagramDepth}
              zoom={diagramZoom}
              objectTypeFilters={diagramObjectTypeFilters}
              presets={diagramPresets}
              showSecondHopEdges={showDiagramSecondHopEdges}
              connectedOnly={diagramConnectedOnly}
              onDiagramQueryChange={setDiagramQuery}
              onEdgeTypeChange={setDiagramEdgeType}
              onFocusKeyChange={setDiagramFocusKey}
              onModeChange={setDiagramMode}
              onDepthChange={setDiagramDepth}
              onZoomChange={setDiagramZoom}
              onObjectTypeFiltersChange={setDiagramObjectTypeFilters}
              onApplyPreset={applyDiagramPreset}
              onShowSecondHopEdgesChange={setShowDiagramSecondHopEdges}
              onConnectedOnlyChange={setDiagramConnectedOnly}
              onSavePreset={saveDiagramPreset}
              productName={productName}
              version={version}
              onSelectTable={navigateToTable}
            />
          ) : activeView === 'objects' ? (
            <ObjectExplorer
              selectedObjectKey={selectedObjectKey}
              onSelectedObjectChange={setSelectedObjectKey}
              objectType={objectType}
              onObjectTypeChange={setObjectType}
              columnUsageQuery={columnUsageQuery}
              onColumnUsageQueryChange={setColumnUsageQuery}
              version={version}
              onDownloadReviewQueue={() =>
                downloadJson(`${selectedProductKey}-${version.version}-documentation-review.json`, getReviewItems(version))
              }
              onSelectTable={navigateToTable}
            />
          ) : activeView === 'impact' ? (
            <ImpactView
              version={version}
              localNotesForVersion={localNotesForVersion}
              onDownloadJson={() =>
                downloadJson(`${selectedProductKey}-${version.version}-table-impact.json`, getTableImpactItems(version))
              }
              onSelectTable={navigateToTable}
            />
          ) : activeView === 'health' ? (
            <SchemaHealthView
              version={version}
              onDownloadJson={() =>
                downloadJson(`${selectedProductKey}-${version.version}-schema-health.json`, getSchemaHealthItems(version))
              }
              onSelectTable={navigateToTable}
            />
          ) : activeView === 'dependencies' ? (
            <DependencyReportView
              version={version}
              onDownloadJson={() =>
                downloadJson(
                  `${selectedProductKey}-${version.version}-unresolved-dependencies.json`,
                  getUnresolvedDependencyItems(version),
                )
              }
            />
          ) : activeView === 'import' ? (
            canUseImport && ImportPreviewView ? (
              <Suspense fallback={<div className="loading-state-inline">Loading import tools...</div>}>
                <ImportPreviewView selectedProductKey={selectedProductKey} product={product} />
              </Suspense>
            ) : EditingCapabilityGuard ? (
              <Suspense fallback={<div className="loading-state-inline">Loading editing guard...</div>}>
                <EditingCapabilityGuard />
              </Suspense>
            ) : null
          ) : activeView === 'reporting' ? (
            <ReportingGuide
              version={version}
              product={product}
              onRequestVersionHistory={() => ensureVersionsLoaded(product.versions.map((item) => item.version))}
              onSelectTable={navigateToTable}
              selectedView={selectedReportingView}
              onSelectedViewChange={setSelectedReportingView}
            />
          ) : (
            <TableWorkspace
              documentationCoverage={documentationCoverage}
              selectedTable={selectedTable}
              version={version}
              product={product}
              onRequestVersionHistory={() => ensureVersionsLoaded(product.versions.map((item) => item.version))}
              favoriteObjects={favoriteObjects}
              filteredTables={filteredTables}
              editingEnabled={canEditNotes}
              localNote={localNotesForVersion[selectedTable.id]}
              localNotesKey={localNotesKey}
              localNoteChanged={isLocalNoteDifferent(localNotesForVersion[selectedTable.id], selectedTable)}
              query={query}
              tableConfidenceFilter={tableConfidenceFilter}
              tableNotesFilter={tableNotesFilter}
              onExportLocalNotes={() => {
                if (canEditNotes) {
                  downloadJson(`${selectedProductKey}-${selectedVersion}-local-notes.json`, localNotes);
                }
              }}
              onExportVersionNotes={exportVersionNotes}
              onImportLocalNotes={importLocalNotes}
              onSaveLocalNote={saveLocalTableNote}
              onClearLocalNote={clearLocalTableNote}
              onClearTableSearch={() => setQuery('')}
              onDownloadTableJson={() => downloadJson(`${selectedTable.id}.json`, selectedTable.source)}
              onDownloadTableCsv={() =>
                downloadText(`${selectedTable.id}-columns.csv`, tableToCsv(selectedTable), 'text/csv')
              }
              onDownloadTableMarkdown={() =>
                downloadText(
                  `${selectedTable.id}.md`,
                  tableToMarkdown(selectedTable, productName, selectedVersion, visibleRelationships),
                  'text/markdown',
                )
              }
              onDownloadRelationshipsCsv={() =>
                downloadText(
                  `${selectedTable.id}-relationships.csv`,
                  relationshipsToCsv(selectedTable, visibleRelationships),
                  'text/csv',
                )
              }
              onDownloadUnknownTablesCsv={() =>
                downloadText(
                  `${selectedProductKey}-${selectedVersion}-unknown-tables.csv`,
                  reviewTablesToCsv(unknownTables),
                  'text/csv',
                )
              }
              onQueryChange={setQuery}
              onSelectTable={(tableId) => setSelectedTableId(tableId)}
              onSetTableConfidenceFilter={setTableConfidenceFilter}
              onSetTableNotesFilter={setTableNotesFilter}
              onToggleFavoriteObject={toggleFavoriteObject}
              onOpenReportingScript={(script) => {
                setSelectedReportingView(`script:${script.scriptPath}`);
                setActiveView('reporting');
              }}
              visibleRelationships={visibleRelationships}
              relationshipFilter={relationshipFilter}
              setRelationshipFilter={setRelationshipFilter}
              navigateToTable={navigateToTable}
            />
            )}
          </Suspense>
        </ErrorBoundary>
      </section>
      {commandOpen && (
        <AccessibleModal label="Command palette" onClose={() => setCommandOpen(false)}>
          <div className="command-palette">
            <div className="search-box">
              <Search size={18} />
              <input
                aria-label="Command search"
                placeholder="Search views, tables, columns, objects, relationships"
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
              />
              <button aria-label="Close command palette" type="button" onClick={() => setCommandOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="command-results">
              {filteredCommandItems.map((item) => (
                <button
                  key={`${item.type}:${item.label}`}
                  type="button"
                  onClick={() => {
                    item.action();
                    setCommandOpen(false);
                    setCommandQuery('');
                  }}
                >
                  <span>{item.type}</span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          </div>
        </AccessibleModal>
      )}
      {shortcutHelpOpen && (
        <AccessibleModal labelledBy="keyboard-shortcuts-title" onClose={() => setShortcutHelpOpen(false)}>
          <div className="shortcut-help">
            <button aria-label="Close keyboard shortcuts" type="button" onClick={() => setShortcutHelpOpen(false)}>
              <X size={15} />
            </button>
            <h2 id="keyboard-shortcuts-title">Keyboard shortcuts</h2>
            <dl>
              <div><dt>Ctrl/Command + K</dt><dd>Open command palette</dd></div>
              <div><dt>?</dt><dd>Show or hide shortcuts</dd></div>
              <div><dt>1-{activeViewLabels.length}</dt><dd>Switch primary tabs</dd></div>
              <div><dt>+ / -</dt><dd>Zoom diagram in or out</dd></div>
              <div><dt>F</dt><dd>Reset diagram zoom</dd></div>
              <div><dt>Esc</dt><dd>Clear focused diagram object</dd></div>
            </dl>
          </div>
        </AccessibleModal>
      )}
    </main>
  );
}

const rootElement = document.getElementById('root');
globalThis.laserficheDictionaryRoot ??= createRoot(rootElement);
globalThis.laserficheDictionaryRoot.render(<App />);
