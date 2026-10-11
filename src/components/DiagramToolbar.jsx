import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Download,
  Maximize2,
  Save,
  RotateCcw,
  ScanSearch,
  SlidersHorizontal,
  X,
} from 'lucide-react';

function getObjectTypeLabel(type) {
  return {
    table: 'Table',
    view: 'View',
    routine: 'Routine',
    trigger: 'Trigger',
  }[type] ?? type;
}

export function DiagramToolbar({
  compactColumns,
  connectedOnly,
  curvedConnectors,
  depth,
  dependencyDirection,
  edgeType,
  edgeLabelMode,
  focusedNode,
  highContrastDiagram,
  mode,
  exploration = false,
  objectTypeFilters,
  presets = [],
  selectedRelationship,
  showSecondHopEdges,
  onCenterFocusedObject,
  onChangeObjectTypeFilter,
  onChangeObjectTypeMode,
  onClearFocus,
  onDepthChange,
  onExportDiagramPng,
  onExportDiagramSvg,
  onExportSelectedRelationship,
  onApplyPreset,
  onFitDiagram,
  onFitSelection,
  onPanDiagram,
  onResetFilters,
  onResetView,
  onSavePreset,
  onSetCompactColumns,
  onSetConnectedOnly,
  onSetCurvedConnectors,
  onSetDependencyDirection,
  onSetEdgeLabelMode,
  onSetHighContrastDiagram,
  onSetShowSecondHopEdges,
}) {
  const [openMenu, setOpenMenu] = useState('');

  function toggleMenu(menuName) {
    setOpenMenu((currentMenu) => (currentMenu === menuName ? '' : menuName));
  }

  return (
    <div className="diagram-toolbar">
      <div className="diagram-legend" aria-label="Diagram legend">
        <span className="diagram-legend-row">
          <span><i className="legend-fk" /> Foreign key</span>
          <span><i className="legend-dependency" /> Dependency</span>
          <span><i className="legend-trigger-parent" /> Trigger parent</span>
          <span><i className="legend-focus" /> Direct focused relationship</span>
        </span>
        <span className="diagram-legend-row">
          <span><i className="legend-object-table" /> Table</span>
          <span><i className="legend-object-view" /> View</span>
          <span><i className="legend-object-routine" /> Routine</span>
          <span><i className="legend-object-trigger" /> Trigger</span>
        </span>
      </div>
      <div className="diagram-control-row">
        {!exploration && <label className="diagram-depth-control">
          <span>Depth</span>
          <select
            disabled={mode !== 'focused' || !focusedNode}
            value={depth}
            onChange={(event) => onDepthChange(Number(event.target.value))}
          >
            <option value={1}>1 hop</option>
            <option value={2}>2 hops</option>
          </select>
        </label>}
        <div className="diagram-view-actions" aria-label="Diagram viewport actions">
          <button aria-label="Fit diagram" className="text-button" title="Fit diagram" type="button" onClick={onFitDiagram}>
            <Maximize2 size={14} />
          </button>
          <button aria-label="Fit selection" className="text-button" title="Fit selection" type="button" onClick={onFitSelection}>
            <ScanSearch size={14} />
          </button>
          <button aria-label="Center focus" className="text-button" disabled={!focusedNode} title="Center focus" type="button" onClick={onCenterFocusedObject}>
            <Crosshair size={14} />
          </button>
          <button aria-label="Reset view" className="text-button" title="Reset view" type="button" onClick={onResetView}>
            <RotateCcw size={14} />
          </button>
          <button aria-label="Reset filters" className="text-button" title="Reset filters" type="button" onClick={onResetFilters}>
            <X size={14} />
          </button>
          <details className="diagram-toolbar-menu diagram-preset-menu" open={openMenu === 'presets'}>
            <summary
              aria-label="Diagram presets"
              title="Diagram presets"
              onClick={(event) => {
                event.preventDefault();
                toggleMenu('presets');
              }}
            >
              <Save size={14} />
              <span>Presets</span>
            </summary>
            <div className="diagram-toolbar-menu-panel">
              <button
                type="button"
                onClick={() => {
                  onSavePreset();
                  setOpenMenu('');
                }}
              >
                Save current view
              </button>
              <label>
                <span>Apply preset</span>
                <select
                  value=""
                  onChange={(event) => {
                    onApplyPreset(event.target.value);
                    setOpenMenu('');
                  }}
                >
                  <option value="">Select preset</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <details className="diagram-toolbar-menu diagram-export-menu" open={openMenu === 'export'}>
            <summary
              aria-label="Export diagram"
              title="Export diagram"
              onClick={(event) => {
                event.preventDefault();
                toggleMenu('export');
              }}
            >
              <Download size={14} />
              <span>Export</span>
            </summary>
            <div className="diagram-toolbar-menu-panel">
              <button type="button" onClick={onExportDiagramPng}>Viewport PNG</button>
              <button type="button" onClick={onExportDiagramSvg}>Full diagram SVG</button>
              <button disabled={!selectedRelationship} type="button" onClick={onExportSelectedRelationship}>
                Selected relationship JSON
              </button>
            </div>
          </details>
          <details className="diagram-toolbar-menu diagram-options-menu" open={openMenu === 'options'}>
            <summary
              aria-label="Diagram options"
              title="Diagram options"
              onClick={(event) => {
                event.preventDefault();
                toggleMenu('options');
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Options</span>
            </summary>
            <div className="diagram-toolbar-menu-panel diagram-options-panel">
              <div className="diagram-options-section">
                <strong>Display</strong>
                <label>
                  <span>Edge labels</span>
                  <select value={edgeLabelMode} onChange={(event) => onSetEdgeLabelMode(event.target.value)}>
                    <option value="minimal">Minimal</option>
                    <option value="columns">Column pair</option>
                    <option value="full">Full name</option>
                  </select>
                </label>
                <label className="diagram-toggle">
                  <input checked={compactColumns} onChange={(event) => onSetCompactColumns(event.target.checked)} type="checkbox" />
                  <span>Compact cards</span>
                </label>
                <label className="diagram-toggle">
                  <input checked={curvedConnectors} onChange={(event) => onSetCurvedConnectors(event.target.checked)} type="checkbox" />
                  <span>Curved lines</span>
                </label>
                <label className="diagram-toggle">
                  <input checked={highContrastDiagram} onChange={(event) => onSetHighContrastDiagram(event.target.checked)} type="checkbox" />
                  <span>High contrast</span>
                </label>
                {!exploration && mode === 'focused' && depth === 2 ? (
                  <label className="diagram-toggle">
                    <input
                      checked={showSecondHopEdges}
                      onChange={(event) => onSetShowSecondHopEdges(event.target.checked)}
                      type="checkbox"
                    />
                    <span>2-hop lines</span>
                  </label>
                ) : null}
                {mode === 'full' ? (
                  <label className="diagram-toggle">
                    <input
                      checked={connectedOnly}
                      onChange={(event) => onSetConnectedOnly(event.target.checked)}
                      type="checkbox"
                    />
                  <span>Connected only</span>
                </label>
              ) : null}
                {!exploration && (edgeType === 'dependency' || edgeType === 'all') && focusedNode ? (
                  <label>
                    <span>Dependencies</span>
                    <select
                      value={dependencyDirection}
                      onChange={(event) => onSetDependencyDirection(event.target.value)}
                    >
                      <option value="both">References and referenced by</option>
                      <option value="references">References</option>
                      <option value="referencedBy">Referenced by</option>
                    </select>
                  </label>
                ) : null}
              </div>
              <div className="diagram-options-section">
                <strong>Object types</strong>
                <label>
                  <span>Show only</span>
                  <select value="" onChange={(event) => onChangeObjectTypeMode(event.target.value)}>
                    <option value="">Choose type</option>
                    <option value="all">All object types</option>
                    <option value="table">Tables only</option>
                    <option value="view">Views only</option>
                    <option value="routine">Routines only</option>
                    <option value="trigger">Triggers only</option>
                  </select>
                </label>
                <div className="diagram-object-filter" aria-label="Diagram object type filters">
                  {['table', 'view', 'routine', 'trigger'].map((type) => (
                    <label key={type}>
                      <input
                        checked={objectTypeFilters[type]}
                        disabled={!exploration && (type === 'table' || edgeType === 'foreignKey')}
                        onChange={(event) => onChangeObjectTypeFilter(type, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{getObjectTypeLabel(type)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </details>
          <span className="diagram-pan-controls" aria-label="Pan diagram controls">
            <button aria-label="Pan diagram left" title="Pan diagram left" type="button" onClick={() => onPanDiagram(-220, 0)}>
              <ArrowLeft size={14} />
            </button>
            <button aria-label="Pan diagram up" title="Pan diagram up" type="button" onClick={() => onPanDiagram(0, -220)}>
              <ArrowUp size={14} />
            </button>
            <button aria-label="Pan diagram down" title="Pan diagram down" type="button" onClick={() => onPanDiagram(0, 220)}>
              <ArrowDown size={14} />
            </button>
            <button aria-label="Pan diagram right" title="Pan diagram right" type="button" onClick={() => onPanDiagram(220, 0)}>
              <ArrowRight size={14} />
            </button>
          </span>
        </div>
        {focusedNode ? (
          <span className="diagram-focus-label">
            Focused: {focusedNode.key}
            <button aria-label="Clear focused table" onClick={onClearFocus} title="Clear focused table" type="button">
              <X size={14} />
            </button>
          </span>
        ) : (
          <span className="diagram-focus-label">Select a table to center its incoming and outgoing relationships.</span>
        )}
      </div>
    </div>
  );
}
