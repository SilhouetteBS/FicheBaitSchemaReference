export function localNotesToVersionNotes(localNotes, localNotesKey, productKey, productVersion) {
  const tableNotes = localNotes[localNotesKey] ?? {};
  return {
    productKey,
    productVersion,
    tables: Object.fromEntries(
      Object.entries(tableNotes).map(([tableKey, note]) => [
        tableKey,
        {
          confidence: note.confidence,
          reviewStatus: note.reviewStatus,
          owner: note.owner,
          reviewer: note.reviewer,
          lastReviewedAt: note.lastReviewedAt,
          summary: note.summary,
          safeReportingNotes: note.safeReportingNotes ?? [],
          warnings: note.warnings ?? [],
        },
      ]),
    ),
  };
}

export function isLocalNoteDifferent(localNote, table) {
  if (!localNote) {
    return false;
  }

  return (
    (localNote.summary ?? '') !== (table.summary ?? '') ||
    (localNote.confidence ?? '') !== (table.confidence ?? '') ||
    (localNote.reviewStatus ?? '') !== (table.reviewStatus ?? '') ||
    (localNote.owner ?? '') !== (table.owner ?? '') ||
    (localNote.reviewer ?? '') !== (table.reviewer ?? '') ||
    (localNote.lastReviewedAt ?? '') !== (table.lastReviewedAt ?? '') ||
    JSON.stringify(localNote.safeReportingNotes ?? []) !== JSON.stringify(table.safeReportingNotes ?? []) ||
    JSON.stringify(localNote.warnings ?? []) !== JSON.stringify(table.warnings ?? [])
  );
}
