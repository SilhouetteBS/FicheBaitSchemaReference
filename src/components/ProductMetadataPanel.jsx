import { Fragment, useState } from 'react';
import { CalendarClock, Columns3, FileCode2, GitBranch, TableProperties } from 'lucide-react';
import { formatCompletenessValue, getDatabaseRoleExplanation, getObjectCompletionByType, getSnapshotCompletenessRows, getTableCompletionBySchema, getVersionTrendRows } from '../data/schemaCompleteness.js';
import { getConfidenceLegendItems, getSchemaCoverageGaps } from '../data/projectInsights.js';
import { InfoTooltip } from './InfoTooltip.jsx';

export function formatSnapshotDate(value) {
  if (!value) {
    return 'Unknown';
  }

  const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(String(value)) ? value : `${value}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getSnapshotAgeWarning(version) {
  if (!version.exportedAtUtc) {
    return 'Export timestamp is missing; confirm the metadata freshness before relying on it.';
  }
  const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(String(version.exportedAtUtc))
    ? version.exportedAtUtc
    : `${version.exportedAtUtc}Z`;
  const exportedAt = new Date(normalizedValue);
  if (Number.isNaN(exportedAt.getTime())) {
    return 'Export timestamp could not be parsed; confirm the metadata freshness before relying on it.';
  }
  const ageDays = Math.floor((Date.now() - exportedAt.getTime()) / 86400000);
  return ageDays > 180 ? `This metadata export is ${ageDays.toLocaleString()} days old; verify it still matches the target environment.` : '';
}

function getSnapshotStats(version) {
  return [
    {
      label: 'Exported',
      value: formatSnapshotDate(version.exportedAtUtc),
      icon: <CalendarClock size={17} />,
    },
    {
      label: 'Tables',
      value: version.tables.length.toLocaleString(),
      icon: <TableProperties size={17} />,
    },
    {
      label: 'Columns',
      value: version.tables.reduce((total, table) => total + table.columns.length, 0).toLocaleString(),
      icon: <Columns3 size={17} />,
    },
    {
      label: 'Foreign keys',
      value: (version.source?.foreignKeys?.length ?? 0).toLocaleString(),
      icon: <GitBranch size={17} />,
    },
    {
      label: 'Routines',
      value: (version.source?.routines?.length ?? 0).toLocaleString(),
      icon: <FileCode2 size={17} />,
    },
  ];
}

const versionTrendColumns = [
  ['Version', 'Product version for this imported schema snapshot.'],
  ['Schema size', 'Approximate serialized schema metadata size for the snapshot.'],
  ['Objects', 'Total exported tables, views, routines, and triggers.'],
  ['Checks', 'Structural warnings in exported metadata; not a live database health assessment.'],
  ['Deps', 'Resolved SQL expression dependencies compared with total exported dependency rows.'],
  ['Notes', 'Percent of tables with manual notes in this version.'],
];

export function ProductMetadataPanel({ product, productsManifest, productName, version, onDownloadMarkdown, onRequestVersionHistory }) {
  const stats = getSnapshotStats(version);
  const [showSnapshotDetails, setShowSnapshotDetails] = useState(false);
  const source = version.source ?? {};
  const rows = getSnapshotCompletenessRows(version);
  const trendRows = getVersionTrendRows(product);
  const tableCompletionRows = getTableCompletionBySchema(version);
  const objectCompletionRows = getObjectCompletionByType(version);
  const freshnessWarning = getSnapshotAgeWarning(version);
  const importedVersions = product.versions.map((item) => item.version).join(', ');
  const coverageGaps = getSchemaCoverageGaps(productsManifest, product);
  const confidenceLegendItems = getConfidenceLegendItems();

  return (
    <section className="snapshot-panel" aria-label="Product and version metadata freshness">
      <div className="snapshot-main">
        <div>
          <p className="snapshot-kicker">Product/version</p>
          <h2>{productName} {version.version}</h2>
          {freshnessWarning && <p className="snapshot-warning">{freshnessWarning}</p>}
        </div>
        <div className="snapshot-actions">
          <button
            aria-expanded={showSnapshotDetails}
            className="snapshot-details-button"
            onClick={() => {
              setShowSnapshotDetails((current) => {
                if (!current) {
                  onRequestVersionHistory?.();
                }
                return !current;
              });
            }}
            type="button"
          >
            {showSnapshotDetails ? 'Hide details' : 'Metadata details'}
          </button>
          <button className="snapshot-details-button" onClick={onDownloadMarkdown} type="button">
            Markdown
          </button>
        </div>
      </div>
      <div className="snapshot-stats">
        {stats.map((stat) => (
          <div className="snapshot-stat" key={stat.label}>
            {stat.icon}
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
      {showSnapshotDetails ? (
        <div className="snapshot-details" aria-label="Product and version metadata completeness">
          <div>
            <h3>Export manifest and coverage</h3>
            <p>
              Product and version identity come from the export manifest and static manifests, not the SQL Server
              database name. Database names can differ by environment.
            </p>
          </div>

          <div className="snapshot-details-card-stack">
            <div className="snapshot-completeness-grid" aria-label="Metadata object counts">
              {rows.map((row) => (
                <span key={row.label}>
                  <strong>{row.value}</strong>
                  {row.label}
                </span>
              ))}
            </div>
            <div className="snapshot-completeness-grid" aria-label="Object documentation completion by type">
              {objectCompletionRows.map((row) => (
                <span key={row.label}>
                  <strong>{row.value}</strong>
                  <span className="snapshot-card-label">
                    {row.label}
                    {row.tooltip && <InfoTooltip label={`${row.label}: ${row.tooltip}`}>{row.tooltip}</InfoTooltip>}
                  </span>
                </span>
              ))}
            </div>
            <div className="snapshot-completeness-grid" aria-label="Table documentation completion by schema">
              {tableCompletionRows.slice(0, 10).map((row) => (
                <span key={row.label}>
                  <strong>{row.value}</strong>
                  <span className="snapshot-card-label">
                    {row.label}
                    {row.tooltip && <InfoTooltip label={`${row.label}: ${row.tooltip}`}>{row.tooltip}</InfoTooltip>}
                  </span>
                </span>
              ))}
            </div>

            <dl className="snapshot-manifest-list">
              <div>
                <dt>Export format</dt>
                <dd>{formatCompletenessValue(source.exportFormatVersion)}</dd>
              </div>
              <div>
                <dt>Export script</dt>
                <dd>{formatCompletenessValue(source.exportScriptVersion)}</dd>
              </div>
              <div>
                <dt>Database role</dt>
                <dd>
                  <strong>{formatCompletenessValue(source.databaseRole)}</strong>
                  <span>{getDatabaseRoleExplanation(source.databaseRole)}</span>
                </dd>
              </div>
              <div>
                <dt>Imported versions</dt>
                <dd>{importedVersions || 'None loaded'}</dd>
              </div>
            </dl>
          </div>
          <div className="snapshot-trend-table">
            <h3>Version trends</h3>
            <div>
              {versionTrendColumns.map(([label, tooltip]) => (
                <span className="snapshot-trend-heading" key={label}>
                  {label}
                  <InfoTooltip label={`${label}: ${tooltip}`}>{tooltip}</InfoTooltip>
                </span>
              ))}
              {trendRows.map((row) => (
                <Fragment key={row.version}>
                  <strong>{row.version}</strong>
                  <span>{row.schemaSize.toLocaleString()}</span>
                  <span>{row.objectCount.toLocaleString()}</span>
                  <span>{row.healthIssues.toLocaleString()}</span>
                  <span>{row.dependencyResolution}</span>
                  <span>{row.notesCompletion}</span>
                </Fragment>
              ))}
            </div>
          </div>
          <div className="snapshot-support-grid">
            <section className="snapshot-support-panel">
              <div className="section-title-row">
                <h3>Confidence legend</h3>
                <span>{confidenceLegendItems.length}</span>
              </div>
              <div className="confidence-legend-list">
                {confidenceLegendItems.map((item) => (
                  <div key={item.value}>
                    <strong>{item.label}</strong>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="snapshot-support-panel">
              <div className="section-title-row">
                <h3>Coverage gaps</h3>
                <span>{coverageGaps.length}</span>
              </div>
              {coverageGaps.length === 0 ? (
                <p className="empty-state">No immediate product/version export gaps were detected from the current manifests.</p>
              ) : (
                <ul>
                  {coverageGaps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
