import { useEffect, useMemo, useState } from 'react';
import { exportCompatibilityNotes, glossaryTerms } from '../data/glossary.js';
import { copyTextToClipboard } from '../data/clipboard.js';
import {
  buildGeneratedReportingExamples,
  getCommunityReportingPatterns,
  getReportingPaths,
  getReportingQuestions,
  loadGeneratedCommunityReportingPatterns,
} from '../data/reporting.js';

const guidanceItems = [
  { key: 'questions', label: 'Common questions' },
  { key: 'paths', label: 'Common paths' },
  { key: 'generated', label: 'Generated examples' },
];

const referenceItems = [
  { key: 'glossary', label: 'Glossary' },
  { key: 'compatibility', label: 'Export compatibility' },
  { key: 'cautions', label: 'Caution notes' },
  { key: 'processed-queue', label: 'Processed queue' },
];

const notepadPlusSqlTheme = {
  name: 'fichebait-notepad-plus-sql',
  type: 'light',
  colors: {
    'editor.background': '#f8fbfc',
    'editor.foreground': '#000000',
  },
  tokenColors: [
    {
      scope: [
        'keyword',
        'keyword.control',
        'keyword.operator',
        'storage',
        'support.type',
        'constant.language',
      ],
      settings: { foreground: '#0000ff', fontStyle: 'bold' },
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#008000' },
    },
    {
      scope: ['string', 'constant.character'],
      settings: { foreground: '#808080' },
    },
    {
      scope: ['constant.numeric'],
      settings: { foreground: '#ff0000' },
    },
    {
      scope: ['entity.name.function', 'support.function'],
      settings: { foreground: '#8000ff' },
    },
    {
      scope: ['entity.name.type', 'entity.name.class', 'variable.other.member'],
      settings: { foreground: '#0080c0' },
    },
    {
      scope: ['punctuation', 'meta.brace'],
      settings: { foreground: '#000000' },
    },
  ],
};

let sqlHighlighterPromise;

function getSqlHighlighter() {
  if (!sqlHighlighterPromise) {
    sqlHighlighterPromise = Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('@shikijs/langs/sql'),
    ]).then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }, sqlLanguage]) =>
      createHighlighterCore({
        langs: [sqlLanguage.default],
        themes: [notepadPlusSqlTheme],
        engine: createJavaScriptRegexEngine(),
      }),
    );
  }

  return sqlHighlighterPromise;
}

function getScriptKey(pattern) {
  return `script:${pattern.scriptPath}`;
}

function NavButton({ item, selectedView, onSelect, meta, stackedMeta = false }) {
  return (
    <button
      type="button"
      className={[selectedView === item.key ? 'selected' : '', stackedMeta ? 'stacked-meta' : '']
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(item.key)}
      title={item.label}
    >
      <span>{item.label}</span>
      {meta ? <em>{meta}</em> : null}
    </button>
  );
}

function TableLinks({ tables, knownTables, onSelectTable }) {
  return (
    <div className="example-table-links">
      {tables.map((tableKey) =>
        knownTables.has(tableKey) ? (
          <button key={tableKey} type="button" onClick={() => onSelectTable(tableKey)}>
            {tableKey}
          </button>
        ) : (
          <span key={tableKey}>{tableKey}</span>
        ),
      )}
    </div>
  );
}

function ReportingSectionHeader({ title, count }) {
  return (
    <div className="section-title-row">
      <h3>{title}</h3>
      {typeof count === 'number' ? <span>{count}</span> : null}
    </div>
  );
}

function ScriptStatusTags({ tags }) {
  const tagClasses = {
    'Community sourced': 'community-tag-source',
    'Schema matched': 'community-tag-matched',
    'Schema neutral': 'community-tag-neutral',
    'Not live tested': 'community-tag-untested',
    'Needs review': 'community-tag-review',
    'Read-only': 'community-tag-readonly',
    'Context only': 'community-tag-context',
  };

  return (
    <div className="community-pattern-tags">
      {tags.map((tag) => (
        <span key={tag} className={tagClasses[tag] ?? ''}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function SqlViewer({ sql }) {
  const [highlightedSql, setHighlightedSql] = useState({ source: '', status: 'loading', html: '' });

  useEffect(() => {
    let canceled = false;
    setHighlightedSql({ source: sql, status: 'loading', html: '' });

    getSqlHighlighter()
      .then((highlighter) => highlighter.codeToHtml(sql, { lang: 'sql', theme: notepadPlusSqlTheme.name }))
      .then((html) => {
        if (!canceled) {
          setHighlightedSql({ source: sql, status: 'ready', html });
        }
      })
      .catch(() => {
        if (!canceled) {
          setHighlightedSql({ source: sql, status: 'error', html: '' });
        }
      });

    return () => {
      canceled = true;
    };
  }, [sql]);

  return (
    <div className="reporting-sql-viewer" role="region" aria-label="SQL viewer">
      {highlightedSql.status === 'ready' && highlightedSql.source === sql ? (
        <div className="reporting-sql-highlight" dangerouslySetInnerHTML={{ __html: highlightedSql.html }} />
      ) : (
        <pre className="reporting-script-content sql reporting-sql-fallback">{sql}</pre>
      )}
    </div>
  );
}

function ScriptAnswersLinks({ links = [] }) {
  if (links.length === 0) {
    return (
      <div className="reporting-answers-links">
        <p className="empty-note">No public resource links are documented for this script yet.</p>
      </div>
    );
  }

  return (
    <div className="reporting-answers-links">
      {links.map((link) => (
        <article key={link.url}>
          <a href={link.url} target="_blank" rel="noreferrer">
            {link.title}
          </a>
          <span>{link.url}</span>
        </article>
      ))}
    </div>
  );
}

export function ReportingGuide({
  version,
  onSelectTable,
  selectedView = 'overview',
  onSelectedViewChange = () => {},
}) {
  const [scriptTab, setScriptTab] = useState('sql');
  const [scriptContent, setScriptContent] = useState({ key: '', status: 'idle', text: '' });
  const [copyStatus, setCopyStatus] = useState('idle');
  const [generatedCommunityPatterns, setGeneratedCommunityPatterns] = useState([]);
  const [generatedLoadState, setGeneratedLoadState] = useState({ status: 'loading', message: '' });
  const knownTables = useMemo(() => new Set(version.tables.map((table) => table.id)), [version.tables]);
  const reportingPaths = useMemo(() => getReportingPaths(version.source.productKey), [version.source.productKey]);
  const reportingQuestions = useMemo(
    () => getReportingQuestions(version.source.productKey),
    [version.source.productKey],
  );
  const curatedCommunityPatterns = useMemo(
    () => getCommunityReportingPatterns(version.source.productKey),
    [version.source.productKey],
  );
  const communityPatterns = useMemo(
    () => [...curatedCommunityPatterns, ...generatedCommunityPatterns],
    [curatedCommunityPatterns, generatedCommunityPatterns],
  );
  const curatedScriptCount = curatedCommunityPatterns.length;
  const generatedCandidateCount = generatedCommunityPatterns.length;
  const generatedExamples = useMemo(() => buildGeneratedReportingExamples(version), [version]);
  const selectedScript = communityPatterns.find((pattern) => getScriptKey(pattern) === selectedView);

  useEffect(() => {
    setScriptTab('sql');
    setScriptContent({ key: '', status: 'idle', text: '' });
    setCopyStatus('idle');
  }, [version.source.productKey, version.version]);

  useEffect(() => {
    let canceled = false;
    setGeneratedCommunityPatterns([]);
    setGeneratedLoadState({ status: 'loading', message: '' });

    loadGeneratedCommunityReportingPatterns(version.source.productKey)
      .then((patterns) => {
        if (!canceled) {
          setGeneratedCommunityPatterns(patterns);
          setGeneratedLoadState({ status: 'ready', message: '' });
        }
      })
      .catch((error) => {
        if (!canceled) {
          setGeneratedCommunityPatterns([]);
          setGeneratedLoadState({
            status: 'error',
            message: `Schema-matched candidates could not be loaded: ${error.message}`,
          });
        }
      });

    return () => {
      canceled = true;
    };
  }, [version.source.productKey]);

  useEffect(() => {
    if (generatedLoadState.status === 'loading') {
      return;
    }
    const validViews = new Set([
      'overview',
      ...guidanceItems.map((item) => item.key),
      ...referenceItems.map((item) => item.key),
      ...communityPatterns.map((pattern) => getScriptKey(pattern)),
    ]);

    if (!validViews.has(selectedView)) {
      onSelectedViewChange('overview');
    }
  }, [communityPatterns, generatedLoadState.status, onSelectedViewChange, selectedView]);

  useEffect(() => {
    if (!selectedScript || scriptTab === 'answers') {
      setScriptContent({ key: '', status: 'idle', text: '' });
      return undefined;
    }

    const contentLoader = scriptTab === 'sql' ? selectedScript.scriptLoader : selectedScript.evidenceLoader;
    const contentKey = `${selectedScript.scriptPath}:${scriptTab}`;
    let canceled = false;
    setScriptContent({ key: contentKey, status: 'loading', text: '' });

    Promise.resolve()
      .then(() => {
        if (!contentLoader) {
          throw new Error(`Unable to load ${scriptTab === 'sql' ? selectedScript.scriptPath : selectedScript.evidencePath}`);
        }
        return contentLoader();
      })
      .then((text) => {
        if (!canceled) {
          setScriptContent({ key: contentKey, status: 'ready', text });
        }
      })
      .catch((error) => {
        if (!canceled) {
          setScriptContent({ key: contentKey, status: 'error', text: error.message });
        }
      });

    return () => {
      canceled = true;
    };
  }, [scriptTab, selectedScript]);

  function selectReportingView(key) {
    onSelectedViewChange(key);
    setCopyStatus('idle');
    if (key.startsWith('script:')) {
      setScriptTab('sql');
    } else {
      setScriptTab('sql');
      setScriptContent({ key: '', status: 'idle', text: '' });
    }
  }

  async function copySqlToClipboard() {
    if (scriptTab !== 'sql' || scriptContent.status !== 'ready' || !scriptContent.text) {
      return;
    }

    try {
      await copyTextToClipboard(scriptContent.text);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    } catch {
      try {
        await copyTextToClipboard(scriptContent.text);
        setCopyStatus('copied');
        window.setTimeout(() => setCopyStatus('idle'), 1800);
      } catch {
        setCopyStatus('error');
        window.setTimeout(() => setCopyStatus('idle'), 2400);
      }
    }
  }

  function renderOverview() {
    const scriptGroups = [
      {
        key: 'curated',
        title: 'Curated scripts',
        count: curatedScriptCount,
        summary: 'Portable read-only scripts that have been consolidated into reusable reporting patterns.',
        patterns: curatedCommunityPatterns,
      },
      {
        key: 'candidates',
        title: 'Schema-matched candidates',
        count: generatedCandidateCount,
        summary:
          'Answers source candidates whose referenced objects exist in documented schema versions. These still need review before operational use.',
        patterns: generatedCommunityPatterns,
      },
    ].filter((group) => group.count > 0);

    return (
      <section className="reporting-section reporting-section-full">
        <ReportingSectionHeader title="Reporting overview" />
        <div className="reporting-overview-grid">
          <article>
            <strong>{reportingQuestions.length}</strong>
            <span>Common questions</span>
            <p>Starting points for read-only reporting and troubleshooting.</p>
          </article>
          <article>
            <strong>{reportingPaths.length}</strong>
            <span>Common paths</span>
            <p>Product-specific table paths for building reporting queries.</p>
          </article>
          <article>
            <strong>{generatedExamples.length}</strong>
            <span>Generated examples</span>
            <p>Schema-driven starter SQL generated from the selected snapshot.</p>
          </article>
          <article>
            <strong>{communityPatterns.length}</strong>
            <span>Reporting scripts</span>
            <p>{curatedScriptCount} curated and {generatedCandidateCount} schema-matched source candidates.</p>
          </article>
        </div>
        <div className="reporting-schema-note">
          <strong>Schema matched</strong>
          <p>
            Referenced object names exist in at least one documented schema version. It does not mean the SQL was
            live-tested, optimized, or rewritten into a production-ready reporting script.
          </p>
        </div>
        {scriptGroups.length > 0 ? (
          <div className="reporting-script-groups">
            {scriptGroups.map((group) => (
              <section key={group.key} className="reporting-script-group">
                <ReportingSectionHeader title={group.title} count={group.count} />
                <p>{group.summary}</p>
                <div className="reporting-script-summary-list">
                  {group.patterns.map((pattern) => (
                    <article key={pattern.scriptPath}>
                      <div>
                        <h4>{pattern.title}</h4>
                        <p>{pattern.summary}</p>
                        <ScriptStatusTags tags={pattern.tags} />
                      </div>
                      <button type="button" onClick={() => selectReportingView(getScriptKey(pattern))}>
                        Open
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="empty-note">No community reporting scripts are available for this product yet.</p>
        )}
      </section>
    );
  }

  function renderQuestions() {
    return (
      <section className="reporting-section reporting-section-full">
        <ReportingSectionHeader title="Common reporting questions" count={reportingQuestions.length} />
        <div className="reporting-question-list">
          {reportingQuestions.map((item) => (
            <article className="reporting-question" key={item.question}>
              <h4>{item.question}</h4>
              <p>{item.guidance}</p>
              <TableLinks tables={item.tables} knownTables={knownTables} onSelectTable={onSelectTable} />
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderPaths() {
    return (
      <section className="reporting-section reporting-section-full">
        <ReportingSectionHeader title="Common paths" count={reportingPaths.length} />
        <div className="reporting-path-list">
          {reportingPaths.map((path) => (
            <article className="reporting-path" key={path.title}>
              <h4>{path.title}</h4>
              <p>{path.summary}</p>
              <TableLinks tables={path.tables} knownTables={knownTables} onSelectTable={onSelectTable} />
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderGeneratedExamples() {
    return (
      <section className="reporting-section reporting-section-full">
        <ReportingSectionHeader title="Generated examples" count={generatedExamples.length} />
        {generatedExamples.length > 0 ? (
          <div className="query-example-list">
            {generatedExamples.map((example) => (
              <article className="query-example" key={example.title}>
                <div className="query-example-heading">
                  <h4>{example.title}</h4>
                  <span className={example.available ? 'example-status-ready' : 'example-status-review'}>
                    {example.available ? 'Generated' : 'Review path'}
                  </span>
                </div>
                {example.sql ? <pre>{example.sql}</pre> : <p>No SQL generated for this snapshot.</p>}
                <p>{example.note}</p>
                <TableLinks tables={example.tables} knownTables={knownTables} onSelectTable={onSelectTable} />
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">No generated examples are available for this product yet.</p>
        )}
      </section>
    );
  }

  function renderScriptDetail(pattern) {
    if (!pattern) {
      return renderOverview();
    }

    return (
      <section className="reporting-section reporting-section-full">
        <div className="reporting-script-detail-heading">
          <div>
            <h3>{pattern.title}</h3>
            <p>{pattern.summary}</p>
          </div>
          <span>{pattern.sourceCount} sources</span>
        </div>
        {pattern.generated ? (
          <div className="reporting-schema-note">
            <strong>Schema-matched source candidate</strong>
            <p>
              This entry is not a finished script. It exists because the referenced objects were found in documented
              schemas. Review the source, rewrite for your environment, and validate in a test environment before use.
            </p>
          </div>
        ) : null}
        <ScriptStatusTags tags={pattern.tags} />
        <TableLinks tables={pattern.tables} knownTables={knownTables} onSelectTable={onSelectTable} />
        <div className="reporting-script-toolbar">
          <div className="reporting-script-tabs" role="tablist" aria-label={`${pattern.title} content`}>
            {['sql', 'notes', 'answers'].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={scriptTab === tab}
                className={scriptTab === tab ? 'selected' : ''}
                onClick={() => {
                  setScriptTab(tab);
                  setCopyStatus('idle');
                }}
              >
                {tab === 'sql' ? 'SQL' : tab === 'notes' ? 'Review notes' : 'Links to Resources'}
              </button>
            ))}
          </div>
          {scriptTab === 'sql' ? (
            <button
              type="button"
              className="reporting-copy-sql-button"
              onClick={copySqlToClipboard}
              disabled={scriptContent.status !== 'ready' || !scriptContent.text}
            >
              {copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy SQL'}
            </button>
          ) : null}
        </div>
        {scriptTab === 'answers' ? (
          <ScriptAnswersLinks links={pattern.answersLinks} />
        ) : scriptContent.status === 'ready' ? (
          scriptTab === 'sql' ? (
            <SqlViewer sql={scriptContent.text} />
          ) : (
            <pre className="reporting-script-content notes">{scriptContent.text}</pre>
          )
        ) : (
          <div className={`reporting-script-content-state ${scriptContent.status}`}>
            {scriptContent.status === 'error' ? scriptContent.text : 'Loading content...'}
          </div>
        )}
      </section>
    );
  }

  function renderGlossary() {
    return (
      <section className="reporting-section reporting-section-full">
        <ReportingSectionHeader title="Glossary" count={glossaryTerms.length} />
        <div className="glossary-list">
          {glossaryTerms.map((item) => (
            <div key={item.term}>
              <strong>{item.term}</strong>
              <p>{item.definition}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderCompatibility() {
    return (
      <section className="reporting-section reporting-section-full">
        <ReportingSectionHeader title="Export script compatibility" count={exportCompatibilityNotes.length} />
        <ul className="compatibility-list">
          {exportCompatibilityNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    );
  }

  function renderCautions() {
    return (
      <section className="reporting-section reporting-section-full">
        <ReportingSectionHeader title="Caution notes" />
        <div className="reporting-caution-list">
          <article>
            <h4>Keep reporting objects separate</h4>
            <p>Create views, stored procedures, tables, and indexes in a separate reporting database, not inside a Laserfiche product database.</p>
          </article>
          <article>
            <h4>Do not publish write operations</h4>
            <p>Examples that update, delete, insert, merge, alter, drop, or repair Laserfiche product records should stay in the caution list only.</p>
          </article>
          <article>
            <h4>Validate before production use</h4>
            <p>Scripts tagged as not live tested are schema-matched starting points. Validate them in a test environment before depending on them.</p>
          </article>
        </div>
      </section>
    );
  }

  function renderProcessedQueue() {
    return (
      <section className="reporting-section reporting-section-full">
        <ReportingSectionHeader title="Processed non-promoted queue" count={2543} />
        <div className="reporting-overview-grid reporting-queue-summary-grid">
          <article>
            <strong>1046</strong>
            <span>Do not publish</span>
            <p>Unsafe, write-oriented, destructive, environment setup, or support-directed content.</p>
          </article>
          <article>
            <strong>284</strong>
            <span>Manual extraction</span>
            <p>Not promoted because the source needed manual extraction and supportability review.</p>
          </article>
          <article>
            <strong>931</strong>
            <span>Weak candidates</span>
            <p>Reference only because the row had insufficient SQL or schema signal.</p>
          </article>
          <article>
            <strong>236</strong>
            <span>Schema verification</span>
            <p>Reference rows that need additional schema or version confirmation before promotion.</p>
          </article>
          <article>
            <strong>46</strong>
            <span>Ready reference</span>
            <p>Ready but not promoted because it was not a portable read-only reporting script.</p>
          </article>
          <article>
            <strong>2543</strong>
            <span>Processed rows</span>
            <p>All remaining non-promoted Answers queue rows are documented without copying raw forum SQL.</p>
          </article>
        </div>
        <div className="reporting-caution-list">
          <article>
            <h4>Detailed processed queue</h4>
            <p>
              The public-safe queue files are indexed in{' '}
              <a
                href="https://github.com/SilhouetteBS/LaserficheDataDictionary/blob/main/docs/answers-sql-processed-index.md"
                target="_blank"
                rel="noreferrer"
              >
                docs/answers-sql-processed-index.md
              </a>
              . The current schema-verification report is stored in{' '}
              <a
                href="https://github.com/SilhouetteBS/LaserficheDataDictionary/blob/main/docs/answers-sql-schema-verification-2026-07-01.md"
                target="_blank"
                rel="noreferrer"
              >
                docs/answers-sql-schema-verification-2026-07-01.md
              </a>
              .
            </p>
          </article>
          <article>
            <h4>No-reference candidates</h4>
            <p>
              Rows without captured product object names remain in the report only. They are not published as scripts
              until a better extractor or manual review captures usable schema references.
            </p>
          </article>
          <article>
            <h4>Why these are not scripts</h4>
            <p>
              These rows were processed as caution or reference material because publishing them as runnable SQL would
              either be unsafe, unsupported, too environment-specific, or too weakly tied to imported schema.
            </p>
          </article>
        </div>
      </section>
    );
  }

  function renderSelectedView() {
    if (generatedLoadState.status === 'error' && selectedView.startsWith('script:') && !selectedScript) {
      return (
        <div className="reporting-load-warning" role="alert">
          <strong>Unable to load this reporting candidate</strong>
          <p>{generatedLoadState.message}</p>
        </div>
      );
    }
    if (selectedView === 'overview') {
      return renderOverview();
    }
    if (selectedView === 'questions') {
      return renderQuestions();
    }
    if (selectedView === 'paths') {
      return renderPaths();
    }
    if (selectedView === 'generated') {
      return renderGeneratedExamples();
    }
    if (selectedView === 'glossary') {
      return renderGlossary();
    }
    if (selectedView === 'compatibility') {
      return renderCompatibility();
    }
    if (selectedView === 'cautions') {
      return renderCautions();
    }
    if (selectedView === 'processed-queue') {
      return renderProcessedQueue();
    }
    return renderScriptDetail(selectedScript);
  }

  return (
    <section className="detail-surface">
      <div className="detail-heading">
        <div>
          <h2>Reporting guide</h2>
          <p>Product-scoped read-only paths and SQL patterns for support-safe exploration.</p>
        </div>
      </div>
      <div className="reporting-workspace">
        <aside className="reporting-nav" aria-label="Reporting sections">
          <div className="reporting-nav-group">
            <NavButton item={{ key: 'overview', label: 'Overview' }} selectedView={selectedView} onSelect={selectReportingView} />
          </div>
          <div className="reporting-nav-group">
            <strong>Guidance</strong>
            {guidanceItems.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                selectedView={selectedView}
                onSelect={selectReportingView}
                meta={
                  item.key === 'questions'
                    ? reportingQuestions.length
                    : item.key === 'paths'
                      ? reportingPaths.length
                      : generatedExamples.length
                }
              />
            ))}
          </div>
          <div className="reporting-nav-group">
            <strong>
              <span>Curated scripts</span>
              <em>{curatedScriptCount}</em>
            </strong>
            {curatedCommunityPatterns.length > 0 ? (
              curatedCommunityPatterns.map((pattern) => (
                <NavButton
                  key={pattern.scriptPath}
                  item={{ key: getScriptKey(pattern), label: pattern.title }}
                  selectedView={selectedView}
                  onSelect={selectReportingView}
                  meta={pattern.tags.includes('Not live tested') ? 'Not live tested' : undefined}
                  stackedMeta
                />
              ))
            ) : (
              <p>No curated scripts yet.</p>
            )}
          </div>
          <div className="reporting-nav-group">
            <strong>
              <span>Schema-matched candidates</span>
              <em>{generatedCandidateCount}</em>
            </strong>
            {generatedLoadState.status === 'loading' ? (
              <p>Loading candidates...</p>
            ) : generatedLoadState.status === 'error' ? (
              <p role="alert">Candidates unavailable.</p>
            ) : generatedCommunityPatterns.length > 0 ? (
              generatedCommunityPatterns.map((pattern) => (
                <NavButton
                  key={pattern.scriptPath}
                  item={{ key: getScriptKey(pattern), label: pattern.title }}
                  selectedView={selectedView}
                  onSelect={selectReportingView}
                  meta="Needs review"
                  stackedMeta
                />
              ))
            ) : (
              <p>No candidates yet.</p>
            )}
          </div>
          <div className="reporting-nav-group">
            <strong>Reference</strong>
            {referenceItems.map((item) => (
              <NavButton key={item.key} item={item} selectedView={selectedView} onSelect={selectReportingView} />
            ))}
          </div>
        </aside>
        <div className="reporting-detail-pane">{renderSelectedView()}</div>
      </div>
    </section>
  );
}
