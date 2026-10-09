export function buildCorrectionIssueUrl({ productKey, productName, version, view, objectLabel, currentUrl }) {
  if (currentUrl) {
    const page = new URL(currentUrl);
    for (const [key, value] of [['product', productKey], ['version', version], ['view', view]]) {
      if (value) page.searchParams.set(key, value);
    }
    if (objectLabel && view?.toLowerCase() === 'tables') page.searchParams.set('table', objectLabel);
    if (objectLabel && view?.toLowerCase() === 'objects') page.searchParams.set('object', objectLabel);
    if (objectLabel && view?.toLowerCase() === 'reporting') page.searchParams.set('reporting', objectLabel);
    currentUrl = page.toString();
  }
  const issueUrl = new URL('https://github.com/SilhouetteBS/FicheBaitSchemaReference/issues/new');
  const productLabel = productName || productKey || '';
  const productFieldValue = ['Forms', 'LFDS', 'Repository', 'Workflow'].includes(productLabel)
    ? productLabel
    : 'Other or unsure';
  const areaOptions = new Set([
    'Tables',
    'Compare',
    'Diagram',
    'Objects',
    'Impact',
    'Health',
    'Dependencies',
    'Import',
    'Reporting',
    'AI export package',
  ]);

  issueUrl.searchParams.set('template', 'documentation-correction.yml');
  issueUrl.searchParams.set('title', `Documentation correction: ${productLabel} ${version || ''}`.trim());
  issueUrl.searchParams.set('labels', 'documentation,needs-review');
  issueUrl.searchParams.set('correction_type', 'Other correction or update');
  issueUrl.searchParams.set('product', productFieldValue);
  issueUrl.searchParams.set('version', version || '');
  const area = [...areaOptions].find((option) => option.toLowerCase() === String(view ?? '').toLowerCase());
  issueUrl.searchParams.set('area', area ?? 'Other or unsure');
  issueUrl.searchParams.set('schema_object', objectLabel || '');
  issueUrl.searchParams.set('current_link', currentUrl || '');
  issueUrl.searchParams.set(
    'current_detail',
    [
      `Opened from: ${productLabel || 'Unknown product'}${version ? ` ${version}` : ''}`,
      view ? `Page or area: ${view}` : '',
      objectLabel ? `Object: ${objectLabel}` : '',
      currentUrl ? `Current page link: ${currentUrl}` : '',
      '',
      'Describe the wording, behavior, relationship, or query guidance that seems incorrect or incomplete:',
    ]
      .filter((line) => line !== '')
      .join('\n'),
  );
  issueUrl.searchParams.set('suggested_update', 'Describe the proposed correction or update.');
  issueUrl.searchParams.set(
    'source_context',
    'Include non-sensitive source context, version details, Laserfiche Answers links, documentation links, or schema evidence if available.',
  );
  issueUrl.searchParams.set(
    'safety_acknowledgement',
    'This correction is intended for read-only reporting, troubleshooting, or education and does not include row data, customer-specific values, database names, server names, credentials, production screenshots, or other sensitive details.',
  );
  return issueUrl.toString();
}
