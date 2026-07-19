import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, 'docs');
const dataDir = path.join(repoRoot, 'data');
const ledgerPath = path.join(dataDir, 'sources', 'answers-sql-reviewed-posts.json');
const outputPath = path.join(docsDir, 'answers-sql-schema-verification-2026-07-01.md');
const generatedReportingPath = path.join(repoRoot, 'src', 'data', 'generatedReportingCandidates.js');

const processedDocs = fs
  .readdirSync(docsDir)
  .filter((file) => /^answers-sql-processed(?:-|_).+\.md$/i.test(file))
  .filter((file) => !file.includes('exclusions'))
  .sort();

const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : { posts: {} };
const ledgerByUrl = new Map(Object.values(ledger.posts ?? {}).map((post) => [post.url, post]));
const reviewQueuePath = path.join(repoRoot, 'outputs', 'answers-sql-research', 'review-queue.json');
const reviewQueue = fs.existsSync(reviewQueuePath) ? JSON.parse(fs.readFileSync(reviewQueuePath, 'utf8')) : {};
const queueByUrl = new Map(
  Object.values(reviewQueue)
    .flat()
    .map((row) => [String(row.sourceLink ?? row.url ?? '').replace(/#.*$/, '').replace(/\/$/, ''), row])
    .filter(([url]) => url),
);

const products = ['forms', 'lfds', 'repository', 'workflow'];

function loadSchemaIndex(product) {
  const productDir = path.join(dataDir, product);
  const versions = fs
    .readdirSync(productDir)
    .filter((version) => fs.existsSync(path.join(productDir, version, 'schema.json')))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return versions.map((version) => {
    const schema = JSON.parse(fs.readFileSync(path.join(productDir, version, 'schema.json'), 'utf8'));
    const fullNames = new Set();
    const bareNames = new Set();
    const addObject = (object, type) => {
      const schemaName = object.schemaName ?? object.schema ?? 'dbo';
      const objectName = object.name;
      if (!objectName) return;
      const fullName = (object.key ?? `${schemaName}.${objectName}`).toLowerCase();
      fullNames.add(fullName);
      bareNames.add(objectName.toLowerCase());
      fullNames.add(`${schemaName}.${objectName}`.toLowerCase());
      if (type === 'routine') {
        fullNames.add(`${schemaName}.${objectName}`.toLowerCase());
      }
    };

    for (const table of schema.tables ?? []) addObject(table, 'table');
    for (const view of schema.views ?? []) addObject(view, 'view');
    for (const routine of schema.routines ?? []) addObject(routine, 'routine');
    for (const trigger of schema.triggers ?? []) addObject(trigger, 'trigger');

    return { version, fullNames, bareNames };
  });
}

const schemaIndex = Object.fromEntries(products.map((product) => [product, loadSchemaIndex(product)]));

function parseProcessedRow(line, sourceFile) {
  const match = line.match(
    /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*([^|]+?)\s*\|\s*\[Answers\]\((https:\/\/answers\.laserfiche\.com\/questions\/[^)]+)\)\s*\|$/,
  );
  if (!match) return null;
  const [, product, status, risk, title, disposition, url] = match;
  return {
    sourceFile,
    product: product.trim().toLowerCase(),
    status: status.trim(),
    risk: risk.trim(),
    title: title.trim(),
    disposition: disposition.trim(),
    url: url.trim(),
  };
}

function normalizeObjectName(name) {
  return String(name ?? '')
    .trim()
    .replace(/^\[?([^\]]+)\]?$/, '$1')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/^database\./i, '')
    .toLowerCase();
}

function objectMatchesVersion(objectName, versionIndex) {
  const normalized = normalizeObjectName(objectName);
  if (!normalized) return false;
  const parts = normalized.split('.').filter(Boolean);
  const bare = parts.at(-1);
  if (versionIndex.fullNames.has(normalized)) return true;
  if (parts.length === 1 && versionIndex.bareNames.has(bare)) return true;
  if (parts.length > 1 && versionIndex.bareNames.has(bare)) return true;
  return false;
}

function inferReferencedObjects(row, queueItem) {
  const versions = schemaIndex[row.product] ?? [];
  const knownFullNames = new Set(versions.flatMap((version) => [...version.fullNames]));
  const knownBareNames = new Set(versions.flatMap((version) => [...version.bareNames]));
  const text = [
    row.title,
    queueItem?.title,
    ...(queueItem?.sqlSnippets ?? []).map((snippet) => snippet.preview),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  const found = new Set();

  const addCandidate = (value) => {
    const normalized = normalizeObjectName(value);
    if (!normalized) return;
    const parts = normalized.split('.').filter(Boolean);
    const bare = parts.at(-1);
    if (knownFullNames.has(normalized)) found.add(normalized);
    else if (knownBareNames.has(bare)) found.add(bare);
  };

  const bracketedSchemaObject = /\[(?:dbo|static_report)\]\s*\.\s*\[([a-z0-9_#$]+)\]/gi;
  let match;
  while ((match = bracketedSchemaObject.exec(text))) addCandidate(match[1]);

  const qualifiedObject = /\b(?:dbo|static_report)\.([a-z0-9_#$]+)\b/gi;
  while ((match = qualifiedObject.exec(text))) addCandidate(match[1]);

  const sqlObjectReference =
    /\b(?:from|join|update|into|exec|execute)\s+(?:\[[a-z0-9_ -]+\]\s*\.\s*)?(?:\[(?:dbo|static_report)\]\s*\.\s*|(?:dbo|static_report)\.)?\[?([a-z_][a-z0-9_#$]*)\]?/gi;
  while ((match = sqlObjectReference.exec(text))) addCandidate(match[1]);

  for (const objectName of knownBareNames) {
    const isDistinctEnough = objectName.includes('_') || objectName.length >= 8;
    if (!isDistinctEnough) continue;
    const re = new RegExp(`(^|[^a-z0-9_])${escapeRegex(objectName)}([^a-z0-9_]|$)`, 'i');
    if (re.test(text)) found.add(objectName);
  }

  return [...found].sort();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function verifyRow(row) {
  const ledgerPost = ledgerByUrl.get(row.url);
  const queueItem = queueByUrl.get(row.url);
  let referencedObjects = [...new Set((ledgerPost?.referencedObjects ?? []).map(normalizeObjectName).filter(Boolean))];
  if (referencedObjects.length === 0) {
    referencedObjects = [...new Set((queueItem?.referencedObjects ?? []).map((object) => object.name ?? object).map(normalizeObjectName).filter(Boolean))];
  }
  if (referencedObjects.length === 0) {
    referencedObjects = inferReferencedObjects(row, queueItem);
  }
  const versions = schemaIndex[row.product] ?? [];

  const versionResults = versions.map((versionIndex) => {
    const matchedObjects = referencedObjects.filter((objectName) => objectMatchesVersion(objectName, versionIndex));
    const missingObjects = referencedObjects.filter((objectName) => !objectMatchesVersion(objectName, versionIndex));
    return {
      version: versionIndex.version,
      matchedObjects,
      missingObjects,
      allMatched: referencedObjects.length > 0 && missingObjects.length === 0,
      anyMatched: matchedObjects.length > 0,
    };
  });

  const confirmedVersions = versionResults.filter((result) => result.allMatched).map((result) => result.version);
  const partialVersions = versionResults
    .filter((result) => !result.allMatched && result.anyMatched)
    .map((result) => result.version);
  const matchedObjectSet = new Set(versionResults.flatMap((result) => result.matchedObjects));
  const unmatchedObjects = referencedObjects.filter((objectName) => !matchedObjectSet.has(objectName));

  let verification = 'No referenced objects captured';
  if (confirmedVersions.length > 0) verification = 'Schema matched';
  else if (partialVersions.length > 0) verification = 'Partial schema match';
  else if (referencedObjects.length > 0) verification = 'No schema match';

  return {
    ...row,
    ledgerPost,
    queueItem,
    referencedObjects,
    confirmedVersions,
    partialVersions,
    unmatchedObjects,
    verification,
  };
}

const candidates = [];
for (const sourceFile of processedDocs) {
  const content = fs.readFileSync(path.join(docsDir, sourceFile), 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line.includes('| Needs schema verification |')) continue;
    const row = parseProcessedRow(line, sourceFile);
    if (row) candidates.push(row);
  }
}

const uniqueByUrl = new Map();
for (const candidate of candidates) {
  if (!uniqueByUrl.has(candidate.url)) uniqueByUrl.set(candidate.url, candidate);
}

const verified = [...uniqueByUrl.values()].map(verifyRow);
const counts = verified.reduce((acc, row) => {
  acc[row.verification] = (acc[row.verification] ?? 0) + 1;
  return acc;
}, {});
const productCounts = verified.reduce((acc, row) => {
  acc[row.product] ??= {};
  acc[row.product][row.verification] = (acc[row.product][row.verification] ?? 0) + 1;
  return acc;
}, {});

function versionText(row) {
  if (row.confirmedVersions.length > 0) return row.confirmedVersions.join(', ');
  if (row.partialVersions.length > 0) return `partial: ${row.partialVersions.join(', ')}`;
  return 'none';
}

function objectsText(row) {
  if (row.referencedObjects.length === 0) return 'none captured';
  const joined = row.referencedObjects.map((objectName) => `\`${objectName}\``).join(', ');
  return joined.length > 220 ? `${joined.slice(0, 217)}...` : joined;
}

function missingText(row) {
  if (row.unmatchedObjects.length === 0) return '';
  const joined = row.unmatchedObjects.map((objectName) => `\`${objectName}\``).join(', ');
  return joined.length > 180 ? `${joined.slice(0, 177)}...` : joined;
}

const lines = [];
lines.push('# Answers SQL Schema Verification');
lines.push('');
lines.push('Generated: 2026-07-01');
lines.push('');
lines.push('This report compares Answers SQL candidates previously marked `Needs schema verification` against the imported Data Dictionary schemas. It verifies object-name presence by product/version; it does not prove that the SQL is correct, performant, or live tested.');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Raw rows reviewed: ${candidates.length}`);
lines.push(`- Unique Answers posts reviewed: ${verified.length}`);
for (const [status, count] of Object.entries(counts).sort()) {
  lines.push(`- ${status}: ${count}`);
}
lines.push('');
lines.push('## Product Summary');
lines.push('');
lines.push('| Product | Schema matched | Partial schema match | No schema match | No referenced objects captured |');
lines.push('| --- | ---: | ---: | ---: | ---: |');
for (const product of products) {
  const productCount = productCounts[product] ?? {};
  lines.push(
    `| ${product} | ${productCount['Schema matched'] ?? 0} | ${productCount['Partial schema match'] ?? 0} | ${productCount['No schema match'] ?? 0} | ${productCount['No referenced objects captured'] ?? 0} |`,
  );
}
lines.push('');

for (const product of products) {
  const rows = verified.filter((row) => row.product === product);
  if (rows.length === 0) continue;
  lines.push(`## ${product}`);
  lines.push('');
  lines.push('| Verification | Source | Confirmed versions | Referenced objects | Missing from all versions |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of rows.sort((a, b) => a.verification.localeCompare(b.verification) || a.title.localeCompare(b.title))) {
    lines.push(
      `| ${row.verification} | [${row.title.replace(/\|/g, '\\|')}](${row.url}) | ${versionText(row)} | ${objectsText(row)} | ${missingText(row)} |`,
    );
  }
  lines.push('');
}

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function qualifyObjectName(product, objectName) {
  const normalized = normalizeObjectName(objectName);
  if (!normalized) return '';
  if (normalized.includes('.')) return normalized;

  const versionIndexes = schemaIndex[product] ?? [];
  for (const versionIndex of versionIndexes) {
    const match = [...versionIndex.fullNames].find((fullName) => fullName.endsWith(`.${normalized}`));
    if (match) return match;
  }
  return `dbo.${normalized}`;
}

function buildCandidateExcerpt(row) {
  const snippetText = (row.queueItem?.sqlSnippets ?? [])
    .map((snippet) => String(snippet.preview ?? '').trim())
    .filter(Boolean)
    .join('\n\n');
  return snippetText.length > 1200 ? `${snippetText.slice(0, 1200)}\n/* excerpt truncated */` : snippetText;
}

const generatedCandidates = products.reduce((acc, product) => {
  acc[product] = [];
  return acc;
}, {});

for (const row of verified.filter((candidate) => candidate.verification === 'Schema matched')) {
  const slug = slugify(`${row.product}-${row.title}`) || slugify(row.url);
  const pathPrefix = `answers-candidates/${row.product}/${slug}`;
  const tables = row.referencedObjects.map((objectName) => qualifyObjectName(row.product, objectName)).filter(Boolean);
  const sourceCount = row.queueItem?.sqlSnippetCount ?? row.queueItem?.sqlSnippets?.length ?? 0;

  generatedCandidates[row.product].push({
    title: row.title,
    summary: `Schema-verified Answers source candidate referencing ${tables.slice(0, 4).join(', ')}${
      tables.length > 4 ? ', and related objects' : ''
    }.`,
    scriptPath: `${pathPrefix}.sql`,
    evidencePath: `${pathPrefix}-evidence.md`,
    sourceCount: Math.max(1, sourceCount),
    tables,
    tags: ['Community sourced', 'Schema matched', 'Not live tested', 'Needs review', 'Unreviewed source excerpt'],
    answersLinks: [{ title: row.title, url: row.url }],
    confirmedVersions: row.confirmedVersions,
    capturedExcerpt: buildCandidateExcerpt(row),
    reviewNotes: row.queueItem?.issues?.length
      ? row.queueItem.issues
      : ['Not live tested. Review before operational use.'],
    improvementSuggestions: row.queueItem?.improvementSuggestions?.length
      ? row.queueItem.improvementSuggestions
      : ['Convert the candidate into a narrow read-only SELECT/view/procedure before promoting it as a finished script.'],
    generated: true,
  });
}

const generatedLines = [];
generatedLines.push('// Generated by tools/verify-answers-schema-candidates.mjs.');
generatedLines.push('// Do not edit this file manually; rerun the verification tool instead.');
generatedLines.push('');
generatedLines.push(`export const generatedReportingCandidates = ${JSON.stringify(generatedCandidates, null, 2)};`);
generatedLines.push('');
fs.writeFileSync(generatedReportingPath, generatedLines.join('\n'));

console.log(
  JSON.stringify(
    {
      rawRows: candidates.length,
      uniquePosts: verified.length,
      counts,
      productCounts,
      output: path.relative(repoRoot, outputPath),
      generatedReporting: path.relative(repoRoot, generatedReportingPath),
      generatedReportingCounts: Object.fromEntries(
        Object.entries(generatedCandidates).map(([product, candidatesForProduct]) => [
          product,
          candidatesForProduct.length,
        ]),
      ),
    },
    null,
    2,
  ),
);
