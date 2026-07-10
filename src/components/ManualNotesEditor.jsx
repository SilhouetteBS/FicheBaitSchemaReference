import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip.jsx';

const confidenceLabels = {
  confirmed: 'Confirmed',
  observed: 'Observed',
  inferred: 'Inferred',
  unknown: 'Unknown',
  deprecated: 'Deprecated',
  do_not_rely_on: 'Do not rely',
};

const reviewStatusLabels = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  stale: 'Stale',
};

export function ManualNotesEditor({
  localNote,
  localNotesKey,
  localNoteChanged,
  selectedTable,
  onExportLocalNotes,
  onExportVersionNotes,
  onImportLocalNotes,
  onClear,
  onSave,
}) {
  const [draft, setDraft] = useState({
    summary: '',
    confidence: selectedTable.confidence,
    reviewStatus: 'draft',
    owner: '',
    reviewer: '',
    lastReviewedAt: '',
    safeReportingNotes: '',
    warnings: '',
  });

  useEffect(() => {
    setDraft({
      summary: localNote?.summary ?? selectedTable.summary ?? '',
      confidence: localNote?.confidence ?? selectedTable.confidence,
      reviewStatus: localNote?.reviewStatus ?? 'draft',
      owner: localNote?.owner ?? '',
      reviewer: localNote?.reviewer ?? '',
      lastReviewedAt: localNote?.lastReviewedAt ?? '',
      safeReportingNotes: (localNote?.safeReportingNotes ?? []).join('\n'),
      warnings: (localNote?.warnings ?? []).join('\n'),
    });
  }, [localNote, selectedTable]);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveDraft() {
    onSave(selectedTable.id, {
      summary: draft.summary.trim(),
      confidence: draft.confidence,
      reviewStatus: draft.reviewStatus,
      owner: draft.owner.trim(),
      reviewer: draft.reviewer.trim(),
      lastReviewedAt: draft.lastReviewedAt,
      safeReportingNotes: draft.safeReportingNotes
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      warnings: draft.warnings
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    });
  }

  function applyTableTemplate() {
    const primaryKeyColumns = selectedTable.keys
      .filter((key) => key.type === 'PK')
      .flatMap((key) => key.columns.map((column) => column.columnName));
    const commonColumns = selectedTable.columns
      .filter((column) => /id|name|date|time|status|type|guid|uuid/i.test(column.name))
      .slice(0, 8)
      .map((column) => `${column.name}: ${column.dataType}`);
    const joinTargets = selectedTable.relationships
      .slice(0, 6)
      .map((relationship) => `${relationship.type} ${relationship.table}`);

    const purposePrompt = `${selectedTable.id} stores [describe the Laserfiche object, process, or runtime state represented by this table].`;
    const generatedNotes = [
      'Safe reporting use: SELECT-only reporting and troubleshooting. Do not write to this table.',
      `Join notes: ${joinTargets.length > 0 ? joinTargets.join('; ') : 'no exported foreign key relationships were found; verify joins before publishing reports.'}`,
      `Known columns: ${commonColumns.length > 0 ? commonColumns.join('; ') : 'review exported columns before documenting.'}`,
      `Version caveats: primary keys ${primaryKeyColumns.length > 0 ? primaryKeyColumns.join(', ') : 'were not exported'}; validate joins against the selected product/version.`,
    ];

    setDraft((current) => ({
      ...current,
      summary: current.summary || purposePrompt,
      safeReportingNotes: [
        current.safeReportingNotes,
        ...generatedNotes,
      ].filter(Boolean).join('\n'),
      warnings: [
        current.warnings,
        'Do not use this documentation as approval to modify Laserfiche product database records.',
      ].filter(Boolean).join('\n'),
    }));
  }

  return (
    <section className="manual-notes-panel">
      <div className="section-title-row">
        <h3>Manual documentation notes</h3>
        <span>{localNoteChanged ? 'Local draft differs' : localNote ? 'Matches current notes' : 'No local draft'}</span>
      </div>
      <div className="notes-editor-grid">
        <label>
          <span>
            Confidence
            <InfoTooltip label="Confidence describes how strongly the table purpose and reporting guidance have been reviewed.">
                Confirmed is reviewed against reliable source knowledge. Observed and inferred need additional review.
                Unknown means manual documentation is still pending.
            </InfoTooltip>
          </span>
          <select value={draft.confidence} onChange={(event) => updateDraft('confidence', event.target.value)}>
            {Object.entries(confidenceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Review status</span>
          <select value={draft.reviewStatus} onChange={(event) => updateDraft('reviewStatus', event.target.value)}>
            {Object.entries(reviewStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Owner</span>
          <input
            value={draft.owner}
            onChange={(event) => updateDraft('owner', event.target.value)}
            placeholder="Documentation owner"
          />
        </label>
        <label>
          <span>Reviewer</span>
          <input
            value={draft.reviewer}
            onChange={(event) => updateDraft('reviewer', event.target.value)}
            placeholder="Reviewer"
          />
        </label>
        <label>
          <span>Last reviewed</span>
          <input
            value={draft.lastReviewedAt}
            onChange={(event) => updateDraft('lastReviewedAt', event.target.value)}
            type="date"
          />
        </label>
        <label className="notes-editor-wide">
          <span>Summary</span>
          <textarea
            value={draft.summary}
            onChange={(event) => updateDraft('summary', event.target.value)}
            rows={3}
          />
        </label>
        <label>
          <span>Safe reporting notes</span>
          <textarea
            value={draft.safeReportingNotes}
            onChange={(event) => updateDraft('safeReportingNotes', event.target.value)}
            placeholder="One note per line"
            rows={4}
          />
        </label>
        <label>
          <span>Warnings</span>
          <textarea
            value={draft.warnings}
            onChange={(event) => updateDraft('warnings', event.target.value)}
            placeholder="One warning per line"
            rows={4}
          />
        </label>
      </div>
      <div className="notes-editor-actions">
        <button className="text-button" type="button" onClick={applyTableTemplate}>
          Apply note template
        </button>
        <button className="text-button" type="button" onClick={saveDraft}>
          Save local note
        </button>
        <button className="text-button" type="button" onClick={() => onClear(selectedTable.id)}>
          Clear local note
        </button>
        <button className="text-button" type="button" onClick={onExportLocalNotes}>
          Export local notes
        </button>
        <button className="text-button" type="button" onClick={onExportVersionNotes}>
          Export notes.json
        </button>
        <label className="import-notes-button">
          <Upload size={16} />
          <span>Import notes</span>
          <input accept="application/json,.json" type="file" onChange={onImportLocalNotes} />
        </label>
      </div>
      <p className="notes-editor-footnote">
        Local storage key: <code>{localNotesKey}</code>. Export notes.json creates a proposed contribution file.
        Review status should move from Draft to In review to Approved before the notes are copied into the static data folder.
      </p>
    </section>
  );
}
