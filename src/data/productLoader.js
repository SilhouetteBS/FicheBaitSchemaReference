import { buildSchemaProduct, validateSchemaSnapshot } from './schemaDictionary.js';
import { attachProductVersions } from './projectInsights.js';

const requestCache = new Map();

export class DataLoadError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'DataLoadError';
    this.details = details;
  }
}

export function resolvePublicUrl(url) {
  if (!url || /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url)) {
    return url;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = String(url).replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
}

export async function fetchJson(url, { refresh = false } = {}) {
  const requestUrl = resolvePublicUrl(url);
  if (!refresh && requestCache.has(requestUrl)) {
    return requestCache.get(requestUrl);
  }

  const request = (async () => {
    let response;
    try {
      response = await fetch(requestUrl, { cache: refresh ? 'no-cache' : 'default' });
    } catch (error) {
      throw new DataLoadError(`Unable to request ${requestUrl}.`, [
        'Confirm the static site is serving the public/data folder.',
        error.message,
      ]);
    }

    if (!response.ok) {
      throw new DataLoadError(`Unable to load ${requestUrl}.`, [
        `HTTP status: ${response.status}`,
        'Confirm the product manifest points to an existing JSON file.',
      ]);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new DataLoadError(`Unable to parse JSON from ${requestUrl}.`, [
        'Confirm the file was exported as JSON and was not saved as text, HTML, or CSV.',
        error.message,
      ]);
    }
  })();

  if (!refresh) {
    requestCache.set(requestUrl, request);
  }
  try {
    return await request;
  } catch (error) {
    requestCache.delete(requestUrl);
    throw error;
  }
}

export async function loadVersionEntry(versionEntry) {
  const schema = await fetchJson(versionEntry.schemaUrl).catch((error) => {
    throw new DataLoadError(`Unable to load schema snapshot for ${versionEntry.version}.`, [
      versionEntry.schemaUrl,
      error.message,
      ...(error.details ?? []),
    ]);
  });
  const schemaErrors = validateSchemaSnapshot(schema);
  if (schemaErrors.length > 0) {
    throw new DataLoadError(`Schema snapshot failed validation for ${versionEntry.version}.`, [
      versionEntry.schemaUrl,
      ...schemaErrors.slice(0, 8),
      ...(schemaErrors.length > 8 ? [`${schemaErrors.length - 8} more validation errors.`] : []),
    ]);
  }

  let notes = { tables: {} };
  let warning = '';
  try {
    notes = await fetchJson(versionEntry.notesUrl);
  } catch (error) {
    warning = `Notes for ${versionEntry.version} could not be loaded. Table and column documentation may be incomplete. ${error.message}`;
  }
  return { schema, notes, warning };
}

function placeholderVersion(manifest, versionEntry) {
  return {
    version: versionEntry.version,
    exportedAtUtc: '',
    isLoaded: false,
    tables: [],
    source: {
      productKey: manifest.productKey,
      productName: manifest.productName,
      productVersion: versionEntry.version,
      schemas: [],
      tables: [],
      foreignKeys: [],
      views: [],
      routines: [],
      triggers: [],
      dependencies: [],
    },
  };
}

export function buildCatalogProduct(manifest, loadedEntries) {
  const loadedProduct = buildSchemaProduct(loadedEntries);
  const loadedVersions = new Map(
    loadedProduct.versions.map((version) => [version.version, { ...version, isLoaded: true }]),
  );
  return attachProductVersions({
    id: manifest.productKey ?? loadedProduct.id,
    name: manifest.productName ?? loadedProduct.name,
    versions: manifest.versions.map((versionEntry) =>
      loadedVersions.get(versionEntry.version) ?? placeholderVersion(manifest, versionEntry)),
  });
}
