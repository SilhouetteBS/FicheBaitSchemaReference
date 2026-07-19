import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'outputs', 'answers-sql-research');
const sourceDir = path.join(root, 'data', 'sources');
const reviewedPostsPath = path.join(sourceDir, 'answers-sql-reviewed-posts.json');
const seedPath = path.join(root, '.tmp', 'answers-sql-research', 'candidates.json');
const reviewExisting = process.argv.includes('--review-existing');
const forceSeeds = process.argv.includes('--force-seeds');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const batchLimit = Math.max(1, Math.min(250, Number(limitArg?.split('=')[1] ?? 50) || 50));

const productSearchTerms = {
  forms: [
    'Forms SQL', 'Forms database query', 'cf_bp_main_instances', 'cf_bp_worker_instances',
    'cf_bp_worker_instnc_to_resume', 'cf_forms', 'cf_bp_data', 'bp_instance_errors',
    'LFForms dbo', 'Forms database table', 'Forms stored procedure', 'Forms view SQL',
    'Forms Instance Monitoring', 'Forms suspended tasks SQL', 'Forms submission field values SQL',
    'Forms variables SQL', 'Forms process metrics SQL', 'Forms terminated instance SQL',
  ],
  lfds: [
    'LFDS SQL', 'LFDS database query', 'Laserfiche Directory Server SQL',
    'Laserfiche Directory Server database', 'directory_objects', 'identity_providers',
    'LFDS users groups SQL', 'LFDS license database', 'LFDS stored procedure', 'LFDS views',
    'LFDS dbo', 'Laserfiche Directory Server users SQL',
    'Laserfiche Directory Server groups SQL', 'LFDS identity provider SQL',
    'LFDS last sign in SQL', 'LFDS license SQL query',
  ],
  repository: [
    'Laserfiche repository database SQL', 'Repository database query Laserfiche',
    'Laserfiche database query', 'toc SQL Laserfiche', 'vol SQL Laserfiche',
    'propval SQL Laserfiche', 'trustee SQL Laserfiche', 'Laserfiche templates fields SQL',
    'Laserfiche entries SQL', 'Laserfiche Repository stored procedure', 'Laserfiche dbo SQL',
    'Laserfiche database table query', 'Laserfiche repository database table',
    'Laserfiche entry SQL query', 'Laserfiche field values SQL', 'Laserfiche audit SQL',
    'Laserfiche template SQL query', 'Laserfiche folder SQL query',
  ],
  workflow: [
    'Workflow SQL Laserfiche', 'Workflow database query', 'Laserfiche Workflow database',
    'Workflow instance SQL', 'Workflow database table', 'Workflow reporting SQL',
    'Workflow stored procedure', 'Workflow queue SQL', 'Workflow completed instances SQL',
    'Workflow activity SQL', 'workflow dbo Laserfiche', 'Workflow custom query SQL',
    'Workflow SQL activity', 'Workflow database views', 'Workflow status SQL',
    'Workflow token database SQL', 'Workflow running instance SQL',
  ],
};

const sqlSignalTerms = [
  'select ', ' from ', ' join ', ' where ', ' group by ', ' order by ',
  'stored procedure', 'view ', 'sql query', 'database query', 'insert ',
  'update ', 'delete ', 'truncate ', 'exec ', 'execute ',
];

const sqlLeadWords = ['select', 'insert', 'update', 'delete', 'exec', 'execute', 'create', 'alter', 'drop', 'truncate'];

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(html) {
  return decodeHtml(String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' '));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'user-agent': 'Mozilla/5.0 FicheBaitSchemaReferenceResearch/1.0',
      accept: 'text/html,application/xhtml+xml',
    },
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function loadSeedCandidates() {
  try {
    return JSON.parse(await fs.readFile(seedPath, 'utf8'));
  } catch {
    return { forms: [], lfds: [], repository: [], workflow: [] };
  }
}

async function loadExistingReviewCandidates() {
  const reviewedPath = path.join(outDir, 'reviewed.json');
  const existing = JSON.parse(await fs.readFile(reviewedPath, 'utf8'));
  return Object.fromEntries(
    Object.entries(existing).map(([product, items]) => [
      product,
      items.map((item) => ({
        product,
        title: item.title,
        url: normalizeQuestionUrl(item.url),
        foundBy: item.foundBy ?? ['existing review output'],
      })),
    ]),
  );
}

async function loadReviewedPosts() {
  try {
    return JSON.parse(await fs.readFile(reviewedPostsPath, 'utf8'));
  } catch {
    return {
      schemaVersion: 1,
      description: 'Private Laserfiche Answers SQL research tracker. This file is intentionally ignored by git.',
      posts: {},
    };
  }
}

function normalizeQuestionUrl(url) {
  return String(url ?? '').replace(/#.*$/, '').replace(/\/$/, '');
}

function hasReviewedUrl(reviewedPosts, url) {
  return Boolean(reviewedPosts.posts[normalizeQuestionUrl(url)]);
}

function extractQuestionLinks(html, product, foundBy) {
  const links = [];
  const seen = new Set();
  const re = /<a\b[^>]*href="([^"]*\/questions\/\d+\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const href = match[1].startsWith('http')
      ? match[1]
      : new URL(match[1], 'https://answers.laserfiche.com').href;
    const cleanUrl = href.replace(/#.*$/, '');
    const title = decodeHtml(match[2]);
    if (!title || ['posted', 'updated', 'posted by', 'updated by'].includes(title.toLowerCase())) continue;
    if (seen.has(cleanUrl)) continue;
    seen.add(cleanUrl);
    links.push({ product, title, url: cleanUrl, foundBy: [foundBy] });
  }
  return links;
}

async function collectCandidates(product, seeds, reviewedPosts) {
  const map = new Map(
    (seeds ?? [])
      .filter((item) => forceSeeds || !hasReviewedUrl(reviewedPosts, item.url))
      .map((item) => [normalizeQuestionUrl(item.url), { ...item, url: normalizeQuestionUrl(item.url), foundBy: [...new Set(item.foundBy ?? [])] }]),
  );
  for (const term of productSearchTerms[product]) {
    if (map.size >= batchLimit) break;
    for (let page = 1; page <= 8; page += 1) {
      const pageSuffix = page === 1 ? '' : `&page=${page}`;
      const url = `https://answers.laserfiche.com/questions?q=${encodeURIComponent(term)}${pageSuffix}`;
      try {
        const html = await fetchText(url);
        const links = extractQuestionLinks(html, product, term);
        if (links.length === 0) break;
        let addedOnPage = 0;
        for (const item of links) {
          const normalizedUrl = normalizeQuestionUrl(item.url);
          if (hasReviewedUrl(reviewedPosts, normalizedUrl)) continue;
          if (!map.has(normalizedUrl)) {
            map.set(normalizedUrl, { ...item, url: normalizedUrl });
            addedOnPage += 1;
          } else if (!map.get(normalizedUrl).foundBy.includes(term)) {
            map.get(normalizedUrl).foundBy.push(term);
          }
          if (map.size >= batchLimit) break;
        }
        if (map.size >= batchLimit || (page > 1 && addedOnPage === 0)) break;
      } catch (error) {
        console.warn(`Search failed for ${product}: ${term} page ${page}: ${error.message}`);
        break;
      }
    }
  }
  return [...map.values()].slice(0, batchLimit);
}

function upsertReviewedPosts(reviewedPosts, reviewed) {
  const now = new Date().toISOString();
  for (const [product, items] of Object.entries(reviewed)) {
    for (const item of items) {
      const url = normalizeQuestionUrl(item.url);
      reviewedPosts.posts[url] = {
        title: item.title,
        url,
        product,
        reviewedAtUtc: item.reviewedAtUtc || now,
        validation: item.validation,
        riskLevel: item.riskLevel,
        sourceTags: item.sourceTags ?? [],
        contentTags: item.contentTags ?? [],
        referencedObjects: (item.referencedObjects ?? []).map((object) => object.name),
      };
    }
  }
  reviewedPosts.updatedAtUtc = now;
  reviewedPosts.postCount = Object.keys(reviewedPosts.posts).length;
  return reviewedPosts;
}

async function loadSchemaTerms(product) {
  const dir = path.join(root, 'data', product);
  const versions = [];
  const objectMap = new Map();
  const columnMap = new Map();
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents.filter((d) => d.isDirectory())) {
    const schemaPath = path.join(dir, dirent.name, 'schema.json');
    try {
      const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
      versions.push(dirent.name);
      for (const bucket of ['tables', 'views', 'routines', 'triggers']) {
        for (const item of schema[bucket] ?? []) {
          const schemaName = item.schemaName || 'dbo';
          const bareName = String(item.name || '').toLowerCase();
          const fullName = String(item.key || `${schemaName}.${item.name}`).toLowerCase();
          for (const name of [bareName, fullName]) {
            if (!name || name.length < 4) continue;
            if (!objectMap.has(name)) objectMap.set(name, { name, type: bucket.slice(0, -1), versions: new Set() });
            objectMap.get(name).versions.add(dirent.name);
          }
          for (const column of item.columns ?? []) {
            const columnName = String(column.name ?? '').toLowerCase();
            if (!columnName || columnName.length < 3) continue;
            for (const objectName of [bareName, fullName]) {
              const key = `${objectName}.${columnName}`;
              if (!columnMap.has(key)) {
                columnMap.set(key, {
                  objectName,
                  columnName,
                  versions: new Set(),
                });
              }
              columnMap.get(key).versions.add(dirent.name);
            }
          }
        }
      }
    } catch {
      // Ignore incomplete product/version folders.
    }
  }
  return { versions: versions.sort(), objectMap, columnMap };
}

function detectPurpose(title, text) {
  const value = `${title} ${text}`.toLowerCase();
  if (/status|suspended|terminated|running|completed|instance monitoring|long running/.test(value)) return 'Status and instance monitoring';
  if (/submission|field value|variable|form value|signature/.test(value)) return 'Submission, field, or variable reporting';
  if (/lookup|stored procedure|custom query|view/.test(value)) return 'Lookup/query integration';
  if (/template|field|metadata|entry|folder|volume|image path/.test(value)) return 'Repository metadata or entry reporting';
  if (/user|group|identity|license|sign-in|directory/.test(value)) return 'Identity, user, group, or license reporting';
  if (/token|activity|workflow/.test(value)) return 'Workflow token/activity reporting';
  if (/clean|delete|purge|archive|maintenance/.test(value)) return 'Maintenance or cleanup';
  return 'Needs manual purpose review';
}

function extractCodeSnippets(html, text) {
  const snippets = [];
  const codeBlockRe = /<(pre|code)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = codeBlockRe.exec(html))) {
    const snippet = decodeHtml(match[2]);
    if (sqlLeadWords.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(snippet))) {
      snippets.push(snippet);
    }
  }

  const inlineSqlRe = /\b(select|insert|update|delete|exec|execute|create|alter|drop|truncate)\b[\s\S]{0,1800}?(?=(?:\s(?:Reply|Edit|Post Link|More Options|Flag|Repost|Replies|Sort by:)\b)|$)/gi;
  while ((match = inlineSqlRe.exec(text))) {
    const snippet = match[0].replace(/\s+/g, ' ').trim();
    if (/\b(from|join|where|into|set|procedure|view|table|database)\b/i.test(snippet)
      && !/\b(toggle navigation|you are viewing limited content|zoomratio|show posts|please wait while this file loads)\b/i.test(snippet)) {
      snippets.push(snippet);
    }
  }

  const unique = [];
  const seen = new Set();
  for (const snippet of snippets) {
    const normalized = snippet.replace(/\s+/g, ' ').trim();
    if (normalized.length < 30) continue;
    const key = normalized.toLowerCase().slice(0, 300);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized.slice(0, 2400));
  }
  return unique.slice(0, 5);
}

function detectQueryIssues(sqlSnippets) {
  const text = sqlSnippets.join('\n\n');
  const issues = [];
  if (/\bselect\s+\*/i.test(text)) issues.push('Uses SELECT *; prefer an explicit column list.');
  if (/\bfrom\s+\[[^\]]+\]\.\[dbo\]\.|\bfrom\s+[a-z0-9_]+\.(dbo\.)/i.test(text)) {
    issues.push('Appears to hard-code a database name; examples should avoid database-specific names.');
  }
  if (/\bfrom\s+[^;\n]+,\s*[^;\n]+\b/i.test(text) && !/\bjoin\b/i.test(text)) {
    issues.push('May use old comma-join syntax; prefer explicit JOIN syntax.');
  }
  if (/\bselect\b/i.test(text) && !/\btop\s*\(|\bwhere\b|\bfetch\s+next\b/i.test(text)) {
    issues.push('May need a TOP, WHERE, or date filter before use on large production databases.');
  }
  if (/\bnolock\b/i.test(text)) issues.push('Uses NOLOCK; document dirty-read tradeoffs before recommending.');
  if (/\b(delete|update|insert|drop|truncate|alter)\b/i.test(text)) {
    issues.push('Contains write or definition-changing SQL; publish only with strong warnings.');
  }
  if (!text) issues.push('No extractable SQL snippet found; use as context only or manually extract from source.');
  return issues;
}

function classifyRisk(sqlSnippets, text) {
  const combined = sqlSnippets.join('\n');
  if (/\b(drop|truncate|delete)\b/i.test(combined)) return 'Potentially destructive';
  if (/\b(update|insert|alter)\b/i.test(combined)) return 'Unsupported direct database write';
  if (/\b(create)\b.{0,80}\b(view|procedure|function|table|index|trigger)\b/i.test(combined)
    || /\b(stored procedure|custom view)\b/i.test(combined)) {
    return 'Object definition';
  }
  if (/\bselect\b/i.test(combined)) return 'Read-only';
  if (/\b(delete|clean up|clear|purge|maintenance)\b/i.test(text)) return 'Potentially destructive';
  if (/\b(stored procedure|custom view|create view|create procedure)\b/i.test(text)) return 'Object definition';
  return 'Unknown';
}

function scoreRelevance({ sqlSnippets, referencedObjects, title, text }) {
  let score = 0;
  if (sqlSnippets.length) score += 35;
  if (referencedObjects.length) score += Math.min(30, referencedObjects.length * 6);
  if (/\b(sql|database|query|table|view|stored procedure|report|reporting)\b/i.test(title)) score += 15;
  if (/\bselect|join|from|where|dbo\.|cf_|directory_objects|propval|toc|workflow_task_queue\b/i.test(text)) score += 15;
  if (/\berror|timeout|connection|install|upgrade|named pipes|filegroup\b/i.test(title) && !sqlSnippets.length) score -= 20;
  return Math.max(0, Math.min(100, score));
}

function classifyProduct(product, text, referencedObjects) {
  const lower = text.toLowerCase();
  const scores = {
    forms: /\b(forms|cf_|bp_instance|submission)\b/.test(lower) ? 2 : 0,
    lfds: /\b(lfds|directory server|directory_objects|identity_provider|license)\b/.test(lower) ? 2 : 0,
    repository: /\b(repository|toc|propval|propdef|trustee|template|entry)\b/.test(lower) ? 2 : 0,
    workflow: /\b(workflow|activity|token|workflow_task_queue)\b/.test(lower) ? 2 : 0,
  };
  for (const object of referencedObjects) {
    if (/^cf_|bp_instance/.test(object.name)) scores.forms += 2;
    if (/directory_|identity_|license|user_logins/.test(object.name)) scores.lfds += 2;
    if (/toc|propval|propdef|trustee|template|entry/.test(object.name)) scores.repository += 2;
    if (/workflow|activity|queue|instance_completion|search_/.test(object.name)) scores.workflow += 2;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  if (!best || best[1] === 0) return { product, confidence: 'low', reason: 'No stronger product signal found.' };
  return {
    product: best[0],
    confidence: best[0] === product ? 'high' : 'medium',
    reason: best[0] === product ? 'Matches search product and content signals.' : `Content signals suggest ${best[0]}.`,
  };
}

function buildVersionCompatibility(schemaVersions, referencedObjects) {
  if (!referencedObjects.length) {
    return {
      status: 'No schema references matched',
      compatibleVersions: [],
      limitedObjects: [],
    };
  }
  const allVersions = new Set(schemaVersions);
  const commonVersions = new Set(schemaVersions);
  const limitedObjects = [];
  for (const object of referencedObjects) {
    const objectVersions = new Set(object.versions);
    for (const version of [...commonVersions]) {
      if (!objectVersions.has(version)) commonVersions.delete(version);
    }
    if (objectVersions.size !== allVersions.size) {
      limitedObjects.push({
        name: object.name,
        versions: [...objectVersions].sort(),
      });
    }
  }
  return {
    status: commonVersions.size === allVersions.size ? 'All imported versions' : commonVersions.size ? 'Some imported versions' : 'No single imported version has every matched object',
    compatibleVersions: [...commonVersions].sort(),
    limitedObjects,
  };
}

function determinePublishStatus({ relevanceScore, sqlSnippets, referencedObjects, riskLevel, validation, issues }) {
  if (relevanceScore < 25) return 'Weak candidate';
  if (!sqlSnippets.length) return 'Needs manual SQL extraction';
  if (riskLevel === 'Potentially destructive' || riskLevel === 'Unsupported direct database write') return 'Do not publish without explicit warning';
  if (!referencedObjects.length || validation === 'Not validated') return 'Needs schema verification';
  if (issues.some((issue) => /hard-code|SELECT \*|old comma|date filter/i.test(issue))) return 'Ready for review';
  return 'Ready for review';
}

function buildAutomatedReview({ product, item, html, text, title, referencedObjects, sqlSignals, schemaTerms }) {
  const sqlSnippets = extractCodeSnippets(html, text);
  const riskLevel = classifyRisk(sqlSnippets, text);
  const relevanceScore = scoreRelevance({ sqlSnippets, referencedObjects, title, text });
  const productClassification = classifyProduct(product, `${title} ${text}`, referencedObjects);
  const versionCompatibility = buildVersionCompatibility(schemaTerms.versions, referencedObjects);
  const validation = referencedObjects.length ? 'Partially validated' : (sqlSignals.length ? 'Not validated' : 'Needs review');
  const issues = detectQueryIssues(sqlSnippets);
  const sourceTags = /\/\s*Laserfiche\b/i.test(text) || /Laserfiche Employee/i.test(text)
    ? ['Laserfiche employee included']
    : ['Community'];
  const contentTags = [
    sqlSnippets.length ? 'SQL extracted' : 'Context only',
    validation,
    riskLevel,
    productClassification.product === product ? product : `Possible ${productClassification.product}`,
  ];
  const publishStatus = determinePublishStatus({
    relevanceScore,
    sqlSnippets,
    referencedObjects,
    riskLevel,
    validation,
    issues,
  });
  return {
    product,
    title,
    url: item.url,
    foundBy: item.foundBy ?? [],
    relevanceScore,
    productClassification,
    sourceTags,
    contentTags,
    validation,
    versionCompatibility,
    riskLevel,
    purpose: detectPurpose(title, text),
    publishStatus,
    sqlSnippetCount: sqlSnippets.length,
    sqlSnippets: sqlSnippets.map((sql, index) => ({
      index: index + 1,
      preview: sql.slice(0, 500),
    })),
    referencedObjects: referencedObjects.slice(0, 20),
    issues,
    improvementSuggestions: issues,
    sourceLink: item.url,
    reviewedAtUtc: new Date().toISOString(),
  };
}

function classify(product, item, html, schemaTerms) {
  const title = decodeHtml((html.match(/<title>([\s\S]*?)<\/title>/i) ?? [null, item.title])[1]).replace(/ - Laserfiche Answers$/, '');
  const text = stripHtml(html).slice(0, 50000);
  const lower = text.toLowerCase();
  const sqlSignals = sqlSignalTerms.filter((signal) => lower.includes(signal));
  const employeeIncluded = /\/\s*Laserfiche\b/i.test(text) || /Laserfiche Employee/i.test(text);
  const referencedObjects = [];
  for (const object of schemaTerms.objectMap.values()) {
    const name = object.name;
    const isStrongName = name.includes('.') || name.includes('_') || name.length >= 12;
    const bracketed = new RegExp(`\\[${escapeRegex(name)}\\]`, 'i');
    const qualified = new RegExp(`\\bdbo\\.${escapeRegex(name.replace(/^dbo\\./, ''))}\\b`, 'i');
    const plain = new RegExp(`(^|[^a-z0-9_])${escapeRegex(name)}([^a-z0-9_]|$)`, 'i');
    if (qualified.test(lower) || bracketed.test(lower) || (isStrongName && plain.test(lower))) {
      referencedObjects.push({
        name,
        type: object.type,
        versions: [...object.versions].sort(),
      });
    }
    if (referencedObjects.length >= 30) break;
  }
  const snippet = text.match(/.{0,100}\b(select|from|join|where|stored procedure|database query|sql query|dbo\.|cf_|toc|propval|directory_objects|workflow)\b.{0,180}/i)?.[0]
    ?.replace(/\s+/g, ' ')
    ?.trim()
    ?.slice(0, 280) ?? '';
  const automatedReview = buildAutomatedReview({
    product,
    item,
    html,
    text,
    title,
    referencedObjects,
    sqlSignals,
    schemaTerms,
  });
  return {
    product,
    title,
    url: item.url,
    foundBy: item.foundBy ?? [],
    sourceTags: employeeIncluded ? ['Laserfiche employee included'] : ['Community'],
    contentTags: automatedReview.contentTags,
    riskLevel: automatedReview.riskLevel,
    validation: automatedReview.validation,
    purpose: detectPurpose(title, text),
    sqlSignals,
    referencedObjects: referencedObjects.slice(0, 20),
    evidenceSnippet: snippet,
    automatedReview,
    reviewedAtUtc: new Date().toISOString(),
  };
}

function summarizeReviewed(product, reviewed) {
  const direct = reviewed.filter((item) => item.sqlSignals.length || item.referencedObjects.length);
  const validated = reviewed.filter((item) => item.validation === 'Partially validated');
  return [
    `### ${product}`,
    '',
    `- Candidate posts reviewed: ${reviewed.length}`,
    `- Posts with SQL/database signals: ${direct.length}`,
    `- Posts with schema object matches: ${validated.length}`,
    '',
    '| Title | Tags | Validation | Risk | Referenced objects | Source |',
    '| --- | --- | --- | --- | --- | --- |',
    ...direct.slice(0, 50).map((item) => {
      const refs = item.referencedObjects.slice(0, 6).map((ref) => ref.name).join(', ') || 'None matched';
      const tags = [...item.sourceTags, ...item.contentTags].join(', ');
      return `| ${item.title.replaceAll('|', '\\|')} | ${tags.replaceAll('|', '\\|')} | ${item.validation} | ${item.riskLevel} | ${refs.replaceAll('|', '\\|')} | [Answers](${item.url}) |`;
    }),
    '',
  ].join('\n');
}

function summarizeQueue(product, reviewed) {
  const queue = reviewed.map((item) => item.automatedReview).filter(Boolean);
  return [
    `### ${product}`,
    '',
    `- Queue rows: ${queue.length}`,
    `- Ready for review: ${queue.filter((item) => item.publishStatus === 'Ready for review').length}`,
    `- Needs manual SQL extraction: ${queue.filter((item) => item.publishStatus === 'Needs manual SQL extraction').length}`,
    `- Needs schema verification: ${queue.filter((item) => item.publishStatus === 'Needs schema verification').length}`,
    `- Weak candidates: ${queue.filter((item) => item.publishStatus === 'Weak candidate').length}`,
    '',
    '| Score | Status | Title | Validation | Risk | Product check | Source |',
    '| ---: | --- | --- | --- | --- | --- | --- |',
    ...queue
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map((item) => `| ${item.relevanceScore} | ${item.publishStatus} | ${item.title.replaceAll('|', '\\|')} | ${item.validation} | ${item.riskLevel} | ${item.productClassification.product} (${item.productClassification.confidence}) | [Answers](${item.url}) |`),
    '',
  ].join('\n');
}

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(sourceDir, { recursive: true });
const seeds = reviewExisting ? await loadExistingReviewCandidates() : await loadSeedCandidates();
const reviewedPosts = await loadReviewedPosts();
const schemaByProduct = {};
const candidates = {};
const reviewed = {};

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

for (const product of Object.keys(productSearchTerms)) {
  console.warn(`Collecting ${product} candidates...`);
  schemaByProduct[product] = await loadSchemaTerms(product);
  candidates[product] = reviewExisting
    ? (seeds[product] ?? []).slice(0, batchLimit)
    : await collectCandidates(product, seeds[product], reviewedPosts);
  console.warn(`Reviewing ${candidates[product].length} ${product} candidates...`);
  reviewed[product] = await mapLimit(candidates[product], 6, async (item) => {
    try {
      const html = await fetchText(item.url);
      return classify(product, item, html, schemaByProduct[product]);
    } catch (error) {
      return {
        product,
        title: item.title,
        url: item.url,
        foundBy: item.foundBy ?? [],
        sourceTags: ['Fetch failed'],
        contentTags: ['Needs review'],
        riskLevel: 'Unknown',
        validation: 'Needs review',
        purpose: 'Needs manual purpose review',
        sqlSignals: [],
        referencedObjects: [],
        evidenceSnippet: error.message,
        reviewedAtUtc: new Date().toISOString(),
      };
    }
  });
}

const summary = [
  '# Laserfiche Answers SQL Research Draft',
  '',
  'Draft research inventory. This is not yet approved site content.',
  '',
  'Validation labels are initial schema-reference checks only. `Partially validated` means at least one referenced schema object matched an imported schema. It does not mean the query has been tested against a live Laserfiche database.',
  '',
  ...Object.entries(reviewed).map(([product, items]) => summarizeReviewed(product, items)),
].join('\n');
const reviewQueue = Object.fromEntries(
  Object.entries(reviewed).map(([product, items]) => [
    product,
    items.map((item) => item.automatedReview).filter(Boolean),
  ]),
);
const queueSummary = [
  '# Laserfiche Answers SQL Review Queue',
  '',
  'Automated first-pass review output. Human approval is still required before publishing examples to the public site.',
  '',
  ...Object.entries(reviewed).map(([product, items]) => summarizeQueue(product, items)),
].join('\n');

await fs.writeFile(path.join(outDir, 'candidates.json'), JSON.stringify(candidates, null, 2));
await fs.writeFile(path.join(outDir, 'reviewed.json'), JSON.stringify(reviewed, null, 2));
await fs.writeFile(path.join(outDir, 'review-draft.md'), summary);
await fs.writeFile(path.join(outDir, 'review-queue.json'), JSON.stringify(reviewQueue, null, 2));
await fs.writeFile(path.join(outDir, 'review-queue.md'), queueSummary);
await fs.writeFile(reviewedPostsPath, JSON.stringify(upsertReviewedPosts(reviewedPosts, reviewed), null, 2));

console.log(JSON.stringify(Object.fromEntries(Object.entries(reviewed).map(([product, items]) => [product, {
  reviewed: items.length,
  sqlOrSchemaSignals: items.filter((item) => item.sqlSignals.length || item.referencedObjects.length).length,
  schemaMatches: items.filter((item) => item.referencedObjects.length).length,
}]))));
