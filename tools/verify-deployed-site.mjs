const siteUrl = process.env.SITE_URL ?? process.argv[2];

if (!siteUrl) {
  console.error('SITE_URL or first argument is required.');
  process.exit(1);
}

const baseUrl = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);
const failures = [];

async function fetchText(path) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`${url.href} returned HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchJson(path) {
  const text = await fetchText(path);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${new URL(path, baseUrl).href} did not return valid JSON: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const html = await fetchText('./');
assert(/FicheBait Schema Reference/i.test(html), 'Home page must include the app title.');
assert(/Content-Security-Policy/i.test(html), 'Home page must include static CSP metadata.');
assert(!/frame-ancestors/i.test(html),
  'Home page must not claim meta-delivered frame-ancestors protection.');
assert(!/Manual documentation notes|Import preview|Import locked|Drop export JSON files|Editing enabled/i.test(html),
  'Public HTML must not include editing or import UI strings.');

const faviconPath = html.match(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/i)?.[1];
assert(Boolean(faviconPath), 'Home page must reference a favicon.');
if (faviconPath) {
  await fetchText(faviconPath);
}

const assetPaths = [...html.matchAll(/\b(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
assert(assetPaths.length > 0, 'Home page must reference built JavaScript or CSS assets.');
for (const assetPath of assetPaths) {
  await fetchText(assetPath);
}

const products = await fetchJson('data/products.json');
assert(Array.isArray(products.products) && products.products.length > 0, 'products.json must contain product entries.');

for (const product of products.products ?? []) {
  const manifestPath = product.manifestUrl?.replace(/^\//, '') ?? '';
  const manifest = await fetchJson(manifestPath);
  assert(Array.isArray(manifest.versions) && manifest.versions.length > 0,
    `${manifestPath} must contain version entries.`);
  for (const version of manifest.versions ?? []) {
    const schemaPath = version?.schemaUrl?.replace(/^\//, '') ?? '';
    const notesPath = version?.notesUrl?.replace(/^\//, '') ?? '';
    const schema = await fetchJson(schemaPath);
    await fetchJson(notesPath);
    assert(schema.productKey === product.productKey,
      `${schemaPath} productKey ${schema.productKey} must match manifest product ${product.productKey}.`);
    assert(Array.isArray(schema.tables), `${schemaPath} must include a tables array.`);
  }
}

const aiCatalog = await fetchJson('data/ai/catalog.json');
assert(Array.isArray(aiCatalog.products) && aiCatalog.products.length > 0,
  'AI catalog must contain product entries.');

if (failures.length > 0) {
  console.error('Deployed site verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Deployed site verified: ${baseUrl.href}`);
