export function normalizeObjectReference(value) {
  return String(value ?? '').trim().replaceAll('[', '').replaceAll(']', '').toLowerCase();
}

export function objectNamesMatch(reference, fullNames) {
  const parts = normalizeObjectReference(reference).split('.');
  if (!parts.at(-1)) return false;
  if (parts.length >= 2) return fullNames.has(parts.slice(-2).join('.'));
  return [...fullNames].filter((name) => name.split('.').at(-1) === parts[0]).length === 1;
}
