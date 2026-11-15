import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const version = '12.0.2605.385';
const notes = json(`data/workflow/${version}/notes.json`);
const schema = json(`data/workflow/${version}/schema.json`);

// Match the existing direct-alias checks below; this is not a T-SQL compiler.
function directColumnGaps(sql, snapshot) {
  const tables = new Map(snapshot.tables.map(table => [table.key.toLowerCase(), table]));
  const aliases = new Map();
  const gaps = new Set();
  for (const match of sql.matchAll(/(?:FROM|JOIN)\s+\[\$\(\w+\)\]\.dbo\.(\w+)\s+AS\s+(\w+)/gi)) {
    const table = tables.get(`dbo.${match[1]}`.toLowerCase());
    if (!table) gaps.add(`dbo.${match[1]}`);
    aliases.set(match[2].toLowerCase(), new Set(table?.columns.map(column => column.name.toLowerCase()) ?? []));
  }
  for (const match of sql.matchAll(/\b(\w+)\.(\w+)\b/g)) {
    const columns = aliases.get(match[1].toLowerCase());
    if (columns && !columns.has(match[2].toLowerCase())) gaps.add(match[0].toLowerCase());
  }
  return [...gaps].sort();
}

test('Forms volume script has compatible columns only in the documented imported builds', () => {
  const sql = read('reporting/forms/forms-submission-volume-summary.sql');
  const versions = json('data/forms/versions.json').versions;
  for (const { version: build } of versions) {
    const gaps = directColumnGaps(sql, json(`data/forms/${build}/schema.json`));
    assert.deepEqual(gaps, build.startsWith('11.') ? ['m.is_test_mode', 's.is_test_mode'] : [], build);
  }
  assert.match(read('reporting/forms/forms-submission-volume-summary-evidence.md'), /Forms `11\.0\.2311\.50564` is not compatible/);
});

test('Forms volume windows use a single event date and keep distinct process IDs', () => {
  const sql = read('reporting/forms/forms-submission-volume-summary.sql');
  assert.match(sql, /CASE WHEN s\.submission_id IS NULL THEN m\.start_date\s+ELSE s\.date_created END AS reporting_event_date/);
  assert.match(sql, /reporting_event_date >= @FromDate/);
  assert.match(sql, /reporting_event_date < @ToDate/);
  assert.doesNotMatch(sql, /OR instance_start_date [<>]/);
  assert.match(sql, /@FromDate >= @ToDate\s+THROW/);
  assert.match(sql, /GROUP BY\s+bp_id,/);
  assert.match(sql, /CASE WHEN m\.is_test_mode = 1 OR s\.is_test_mode = 1/);
  assert.match(sql, /COUNT_BIG\(DISTINCT bp_instance_id\)/);
});

test('synthetic window examples distinguish cross-window and missing-date cases', () => {
  // Semantic fixtures for the predicates asserted above, not executed T-SQL.
  const from = '2026-01-01';
  const to = '2026-02-01';
  const included = ({ submissionId, submissionDate, instanceStart }) => {
    const date = submissionId == null ? instanceStart : submissionDate;
    return date != null && date >= from && date < to;
  };
  assert.equal(included({ submissionId: 1, submissionDate: '2026-02-03', instanceStart: '2025-12-01' }), false);
  assert.equal(included({ submissionId: 1, submissionDate: '2026-01-01', instanceStart: '2025-12-01' }), true);
  assert.equal(included({ submissionId: 1, submissionDate: '2026-02-01', instanceStart: '2026-01-01' }), false);
  assert.equal(included({ submissionId: null, submissionDate: null, instanceStart: '2026-01-15' }), true);
  assert.equal(included({ submissionId: 1, submissionDate: null, instanceStart: '2026-01-15' }), false);
});

test('LFDS account script exposes older-build gaps without claiming live validation', () => {
  const sql = read('reporting/lfds/lfds-directory-account-state.sql');
  const legacy = new Set(['11.0.2403.2474', '12.0.2506.370']);
  for (const { version: build } of json('data/lfds/versions.json').versions) {
    const gaps = directColumnGaps(sql, json(`data/lfds/${build}/schema.json`));
    assert.deepEqual(gaps, legacy.has(build) ? ['l.target_app'] : [], build);
    const column = json(`data/lfds/${build}/notes.json`).tables['dbo.user_logins'].columns.last_login;
    assert.equal(column.confidence, 'inferred');
    assert.match(column.purpose, /does not establish account inactivity/);
    assert.match(column.purpose, /time-zone semantics remain unverified/);
  }
  assert.match(sql, /TOP limits rows, not users/);
  assert.match(sql, /does not establish inactivity/);
});

test('Forms entry-association diagnostic references columns in every claimed build', () => {
  const required = {
    'dbo.cf_bp_attachment_data': ['attachment_id', 'lfentry_id', 'bp_id', 'is_deleted'],
    'dbo.cf_bp_data_attachment_mapping': ['attachment_id', 'bp_data_id'],
    'dbo.cf_bp_data': ['bp_data_id', 'submission_id'],
    'dbo.cf_submissions': ['submission_id', 'bp_instance_id'],
  };
  const manifest = json('data/forms/versions.json');
  for (const entry of manifest.versions) {
    const tables = json(`data/forms/${entry.version}/schema.json`).tables;
    for (const [key, columns] of Object.entries(required)) {
      const table = tables.find(table => table.key === key);
      assert.ok(table, `${entry.version}: ${key}`);
      for (const name of columns) assert.ok(table.columns.some(column => column.name === name), `${entry.version}: ${key}.${name}`);
    }
  }
  const sql = read('reporting/forms/forms-attachment-entry-usage.sql');
  assert.match(sql, /IF @EntryId IS NULL OR @EntryId <= 0\s+THROW/);
  assert.match(sql, /COUNT\(DISTINCT s\.bp_instance_id\)/);
  assert.match(sql, /SELECT DISTINCT TOP \(1000\)/);
  assert.equal((sql.match(/WHERE a\.lfentry_id = @EntryId/g) ?? []).length, 2);
  assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE|INSERT|MERGE|CREATE|ALTER|DROP|TRUNCATE)\b|SELECT\s+\*|a\.attachment\b|d\.value\b/i);
});

test('LFDS SAML mapping joins only the schema-backed LF identity side', () => {
  const sql = read('reporting/lfds/lfds-user-license-inventory.sql');
  assert.match(sql, /ON saml\.lf_sid = lf_user\.sid/);
  assert.doesNotMatch(sql, /ON saml\.saml_sid\s*=/);
});

test('Workflow review notes reference exported tables and columns', () => {
  const tables = new Map(schema.tables.map((table) => [table.key, table]));
  for (const [key, note] of Object.entries(notes.tables)) {
    assert.ok(tables.has(key), key);
    const names = new Set(tables.get(key).columns.map((column) => column.name));
    for (const column of Object.keys(note.columns ?? {})) assert.ok(names.has(column), `${key}.${column}`);
  }
});

test('unverified Workflow timing remains unknown rather than a timestamp contract', () => {
  for (const key of ['dbo.search_activity', 'dbo.search_activity_log']) {
    assert.equal(notes.tables[key].columns.work_time.confidence, 'unknown');
    assert.match(notes.tables[key].columns.work_time.purpose, /unverified|unknown/i);
  }
  assert.match(notes.tables['dbo.search_activity'].columns.end_time.purpose, /do not use its presence alone/i);
  for (const key of ['dbo.search_status', 'dbo.search_status_log']) {
    assert.match(notes.tables[key].columns.idle_time.purpose, /unverified/i);
  }
});

test('duration SQL excludes current clock guesses and unknown historical states', () => {
  const sql = read('reporting/workflow/workflow-queue-search-diagnostics.sql');
  const view = sql.split('CREATE OR ALTER VIEW rpt.vw_WorkflowSearchActivityDurations')[1]
    .split('CREATE OR ALTER VIEW rpt.vw_WorkflowSearchErrors')[0];
  assert.match(view, /CAST\(NULL AS bigint\) AS elapsed_minutes/);
  assert.match(view, /CASE WHEN al\.close_status = 1 AND al\.end_time >= al\.start_time/);
  assert.match(view, /DATEDIFF_BIG\(SECOND, al\.start_time, al\.end_time\) \/ 60/);
  assert.match(view, /ELSE NULL END AS elapsed_minutes/);
  assert.doesNotMatch(view, /COALESCE\([^)]*end_time|DATEDIFF[^\n]*SYSUTCDATETIME|work_time\s*\//i);
});

test('definition history preserves absent current definitions and historical names', () => {
  const sql = read('reporting/workflow/workflow-definition-history.sql');
  assert.match(sql, /FROM \[\$\(WorkflowDatabase\)\]\.dbo\.workflow_history AS h\s+FULL OUTER JOIN/);
  assert.match(sql, /COALESCE\(w\.workflow_id, h\.workflow_id\) AS workflow_id/);
  assert.match(sql, /COALESCE\(w\.name, h\.workflow_name\) AS workflow_name/);
  assert.match(sql, /w\.current_ver = c\.version/);
});

test('each reviewed product keeps version-specific notes and recognized confidence labels', () => {
  const versions = { forms: '12.0.2607.40144', lfds: '12.0.2607.421', repository: '12.0.4.433', workflow: version };
  const allowed = new Set(['observed', 'confirmed', 'inferred', 'unknown', 'deprecated', 'do_not_rely_on']);
  for (const [product, build] of Object.entries(versions)) {
    const doc = json(`data/${product}/${build}/notes.json`);
    assert.equal(doc.productKey, product);
    assert.equal(doc.productVersion, build);
    for (const table of Object.values(doc.tables)) {
      if (table.confidence) assert.ok(allowed.has(table.confidence));
      for (const column of Object.values(table.columns ?? {})) {
        if (column.confidence) assert.ok(allowed.has(column.confidence));
      }
    }
  }
});

test('curated SQL product-table references exist in the reviewed schemas', () => {
  const versions = { forms: '12.0.2607.40144', lfds: '12.0.2607.421', repository: '12.0.4.433', workflow: version };
  for (const [product, build] of Object.entries(versions)) {
    const snapshot = json(`data/${product}/${build}/schema.json`);
    const tables = new Map(snapshot.tables.map((table) => [table.key.toLowerCase(), table]));
    for (const name of fs.readdirSync(`reporting/${product}`).filter((file) => file.endsWith('.sql'))) {
      const sql = read(`reporting/${product}/${name}`);
      for (const match of sql.matchAll(/\[\$\(\w+\)\]\.dbo\.(\w+)/gi)) {
        assert.ok(tables.has(`dbo.${match[1]}`.toLowerCase()), `${product}/${name}: ${match[1]}`);
      }
      // Check direct product-table aliases only; this is not a T-SQL compiler.
      const aliases = new Map();
      for (const match of sql.matchAll(/(?:FROM|JOIN)\s+\[\$\(\w+\)\]\.dbo\.(\w+)\s+AS\s+(\w+)/gi)) {
        const columns = aliases.get(match[2].toLowerCase()) ?? new Set();
        for (const column of tables.get(`dbo.${match[1]}`.toLowerCase()).columns) columns.add(column.name.toLowerCase());
        aliases.set(match[2].toLowerCase(), columns);
      }
      for (const match of sql.matchAll(/\b(\w+)\.(\w+)\b/g)) {
        const columns = aliases.get(match[1].toLowerCase());
        if (columns) assert.ok(columns.has(match[2].toLowerCase()), `${product}/${name}: ${match[0]}`);
      }
    }
  }
});

test('Forms field labels require form context without dropping raw values', () => {
  const sql = read('reporting/forms/forms-field-value-instance-lookup.sql');
  assert.match(sql, /LEFT JOIN .*\.dbo\.cf_form_submissions AS fs\s+ON d\.submission_id = fs\.submission_id/);
  assert.match(sql, /ON d\.attribute_id = f\.attribute_id\s+AND fs\.form_id = f\.form_id/);
  assert.match(sql, /d\.attribute_id,/);
});

test('Repository labels avoid unsupported type mappings and phantom page counts', () => {
  const entries = read('reporting/repository/repository-path-metadata-lookup.sql');
  assert.match(entries, /WHEN -2 THEN N'Document \(observed\)'/);
  assert.doesNotMatch(entries, /WHEN [12] THEN N'(Document|Shortcut)'/);
  assert.match(entries, /pv\.pos2,/);
  const pages = read('reporting/repository/repository-page-and-search-diagnostics.sql');
  assert.match(pages, /d\.page_id IS NOT NULL AND d\.img_bpp IN \(0, 1\)/);
  assert.doesNotMatch(pages, /ISNULL\(d\.img_bpp, 0\)/);
});
