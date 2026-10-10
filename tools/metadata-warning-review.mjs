export function classifyMetadataWarning(warning) {
  if (warning.includes('has no exported primary key')) return 'primaryKeyObservation';
  if (warning.includes('referencing object not exported:')) return 'missingSourceEvidence';
  if (warning.includes('referenced object not exported:')) return 'missingTargetEvidence';
  if (/views export is empty|triggers export is empty/.test(warning)) return 'emptyExportConfirmation';
  return 'unclassified';
}

export function summarizeMetadataWarnings(warnings) {
  const counts = { primaryKeyObservation: 0, missingSourceEvidence: 0,
    missingTargetEvidence: 0, emptyExportConfirmation: 0, unclassified: 0 };
  for (const warning of warnings) counts[classifyMetadataWarning(warning)] += 1;
  return counts;
}
