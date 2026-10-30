const operations = new Set([
  'browser.unexpected', 'react.render', 'data.load', 'schema.validate',
  'navigation.restore', 'version.change', 'product.change', 'export.download',
]);
const resources = new Set(['products', 'versions', 'schema', 'notes', 'other']);
const failureKinds = new Set(['network', 'http', 'json', 'validation']);
const errorTypes = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'DataLoadError']);
const breadcrumbNames = new Set(['data.requested', 'data.failed', 'export.requested', 'export.failed']);

export function resourceCategory(value) {
  // Never return caller-supplied URLs or identifiers.
  const pathname = String(value).split(/[?#]/)[0];
  if (pathname.endsWith('/products.json')) return 'products';
  if (pathname.endsWith('/versions.json')) return 'versions';
  if (pathname.endsWith('/schema.json')) return 'schema';
  if (pathname.endsWith('/notes.json')) return 'notes';
  return 'other';
}

export function safeContext(input = {}) {
  const result = {};
  if (resources.has(input.resource)) result.resource = input.resource;
  if (failureKinds.has(input.failure_kind)) result.failure_kind = input.failure_kind;
  if (Number.isInteger(input.http_status) && input.http_status >= 100 && input.http_status <= 599) result.http_status = input.http_status;
  return result;
}

function assetLocation(value, origin) {
  try {
    const url = new URL(value, origin);
    // Only built assets from this site. Exclude source paths, extensions and injected scripts.
    if (url.origin !== origin || !/^\/(?:[a-zA-Z0-9_-]+\/)*assets\/[a-zA-Z0-9_.-]+\.js$/.test(url.pathname)) return null;
    return `${origin}${url.pathname}`;
  } catch { return null; }
}

export function sanitizeEvent(event, { config, origin, breadcrumbs = [] }) {
  const operation = operations.has(event.tags?.operation) ? event.tags.operation : 'browser.unexpected';
  const values = (event.exception?.values ?? []).slice(-3).map((exception) => {
    const frames = (exception.stacktrace?.frames ?? []).flatMap((frame) => {
      const filename = assetLocation(frame.filename, origin);
      if (!filename) return [];
      return [{ filename, in_app: true,
        ...(Number.isInteger(frame.lineno) && frame.lineno > 0 ? { lineno: frame.lineno } : {}),
        ...(Number.isInteger(frame.colno) && frame.colno > 0 ? { colno: frame.colno } : {}),
      }];
    }).slice(-30);
    return {
      type: errorTypes.has(exception.type) ? exception.type : 'Error',
      value: `Unexpected failure: ${operation}`,
      ...(frames.length ? { stacktrace: { frames } } : {}),
      mechanism: { type: 'generic', handled: exception.mechanism?.handled !== false },
    };
  });
  // Reconstruct rather than redact: new SDK fields cannot silently expand collection.
  const result = {
    platform: 'javascript', level: 'error', release: config.release, environment: config.environment,
    tags: { site: 'schema-reference', operation, ...safeContext(event.tags) },
    exception: { values: values.length ? values : [{ type: 'Error', value: `Unexpected failure: ${operation}` }] },
    breadcrumbs: breadcrumbs.filter((item) => breadcrumbNames.has(item.message)).slice(-20).map((item) => ({
      category: 'application', message: item.message, level: 'info', data: safeContext(item.data),
    })),
  };
  if (/^[a-f0-9]{32}$/i.test(event.event_id ?? '')) result.event_id = event.event_id;
  if (Number.isFinite(event.timestamp)) result.timestamp = event.timestamp;
  // Preserve only safe debug IDs needed to match privately uploaded source maps.
  const images = (event.debug_meta?.images ?? []).flatMap((image) => {
    const codeFile = assetLocation(image.code_file, origin);
    return codeFile && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(image.debug_id ?? '')
      ? [{ type: 'sourcemap', code_file: codeFile, debug_id: image.debug_id }] : [];
  });
  if (images.length) result.debug_meta = { images };
  return result;
}

export function createEventGate(now = Date.now) {
  const seenErrors = new WeakSet();
  const recent = new Map();
  let count = 0;
  let windowStart = now();
  let windowCount = 0;
  return (event, originalException) => {
    const time = now();
    if (time - windowStart >= 60_000) { windowStart = time; windowCount = 0; }
    if (count >= 50 || windowCount >= 10) return false;
    if (originalException && typeof originalException === 'object' && seenErrors.has(originalException)) return false;
    const key = JSON.stringify([event.tags, event.exception]);
    if (recent.has(key) && time - recent.get(key) < 60_000) return false;
    if (originalException && typeof originalException === 'object') seenErrors.add(originalException);
    if (recent.size >= 100) recent.delete(recent.keys().next().value);
    recent.set(key, time); count++; windowCount++;
    return true;
  };
}
