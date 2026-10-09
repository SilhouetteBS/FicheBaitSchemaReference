import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchemaProduct } from '../src/data/schemaDictionary.js';
import {
  assertGeneratedReportingExamplesSafe,
  buildGeneratedReportingExamples,
  buildTableReportingExamples,
  getReportingPaths,
  getReportingQuestions,
} from '../src/data/reporting.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceDataRoot = path.join(repoRoot, 'data');
const publicDataRoot = path.join(repoRoot, 'public', 'data');
const outputRoots = [path.join(sourceDataRoot, 'ai'), path.join(publicDataRoot, 'ai')];

const supportWarning =
  'This documentation supports read-only reporting, troubleshooting, and education. Direct modification of Laserfiche product databases is unsupported; consult your applicable license and support agreements. Validate changes in a test environment.';

const aiRules = [
  'Generate read-only SQL by default.',
  'Never suggest inserting, updating, deleting, or directly modifying Laserfiche product database objects or records.',
  'If views, stored procedures, indexes, staging tables, or helper tables are requested, place them in a separate reporting database unless the user explicitly states a different supported target.',
  'Cite the product, version, tables, columns, and relationship evidence used.',
  'Call out inferred joins, ambiguous dependencies, undocumented columns, and confidence labels before presenting SQL as reliable.',
  'Do not rely on SQL Server database names; product and version identity come from the export manifest.',
];

const requiredUserContext = [
  'Laserfiche product: Forms, LFDS, Repository, or Workflow.',
  'Product version from catalog.json.',
  'Task type: create query, review query, create reporting view, create reporting stored procedure, explain schema, or troubleshoot SQL.',
  'Reporting goal, expected output, or the existing SQL script to review.',
];

const assistantStartupInstructions = {
  entryPoint: '/data/ai/assistant-instructions.md',
  requiredUserContext,
  behavior: [
    'Read /data/ai/catalog.json first.',
    'If the user has not specified a Laserfiche product and version, ask for them before generating or reviewing SQL.',
    'If the user supplies a SQL Server database name, do not infer the Laserfiche product or version from that name.',
    'Load only the selected product/version AI package unless the user explicitly asks to compare versions or products.',
    'For SQL review, ask for the target product/version if it is missing before validating tables, columns, joins, or dependencies.',
  ],
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : `${value}\n`);
}

function writeJsonl(filePath, rows) {
  writeText(filePath, rows.map((row) => JSON.stringify(row)).join('\n'));
}

function emptyDirectory(directoryPath) {
  fs.rmSync(directoryPath, { recursive: true, force: true });
  fs.mkdirSync(directoryPath, { recursive: true });
}

function normalizeManifestPath(manifestUrl) {
  return manifestUrl.replace(/^\/?data\//, '');
}

function toPublicAiUrl(productKey, version, fileName) {
  return `/data/ai/${productKey}/${version}/${fileName}`;
}

function getTableNotes(notes, tableKey) {
  return notes?.tables?.[tableKey] ?? {};
}

function getColumnNotes(notes, tableKey, columnName) {
  return getTableNotes(notes, tableKey)?.columns?.[columnName] ?? {};
}

function getPrimaryKeyColumns(table) {
  return new Set(
    (table.keys ?? [])
      .filter((key) => key.type === 'PK' || key.typeDescription === 'PRIMARY_KEY_CONSTRAINT')
      .flatMap((key) => (key.columns ?? []).map((column) => column.columnName)),
  );
}

function getObjectKey(object) {
  return object.key ?? object.objectKey ?? object.name ?? `${object.schemaName ?? ''}.${object.name ?? ''}`;
}

function truncateDefinition(definition = '', limit = 8000) {
  if (!definition || definition.length <= limit) {
    return { definition, definitionTruncated: false };
  }

  return {
    definition: definition.slice(0, limit),
    definitionTruncated: true,
  };
}

function summarizeVersion(schema, notes, versionDictionary) {
  const notedTables = schema.tables.filter((table) => Object.keys(getTableNotes(notes, table.key)).length > 0).length;
  const notedColumns = schema.tables.reduce(
    (total, table) =>
      total +
      table.columns.filter((column) => Object.keys(getColumnNotes(notes, table.key, column.name)).length > 0).length,
    0,
  );
  const totalColumns = schema.tables.reduce((total, table) => total + table.columns.length, 0);

  const generatedReportingExamples = buildGeneratedReportingExamples(versionDictionary).filter(
    (example) => example.available,
  );
  assertGeneratedReportingExamplesSafe(
    versionDictionary,
    generatedReportingExamples,
    `${schema.productKey} ${schema.productVersion} AI summary`,
  );

  return {
    productKey: schema.productKey,
    productName: schema.productName,
    version: schema.productVersion,
    databaseRole: schema.databaseRole ?? '',
    exportedAtUtc: schema.exportedAtUtc ?? '',
    exportFormatVersion: schema.exportFormatVersion ?? '',
    counts: {
      schemas: schema.schemas?.length ?? 0,
      tables: schema.tables?.length ?? 0,
      columns: totalColumns,
      foreignKeys: schema.foreignKeys?.length ?? 0,
      indexes: schema.indexes?.length ?? schema.tables.reduce((total, table) => total + (table.indexes ?? []).length, 0),
      views: schema.views?.length ?? 0,
      routines: schema.routines?.length ?? 0,
      triggers: schema.triggers?.length ?? 0,
      dependencies: schema.dependencies?.length ?? 0,
      notedTables,
      notedColumns,
    },
    reportingPaths: getReportingPaths(schema.productKey).filter((item) => item.tables.every((key) => schema.tables.some((table) => table.key === key))),
    reportingQuestions: getReportingQuestions(schema.productKey, new Set(schema.tables.map((table) => table.key))),
    generatedReportingExamples,
  };
}

function tableRows(schema, notes, versionDictionary) {
  const dictionaryTables = new Map(versionDictionary.tables.map((table) => [table.id, table]));
  return schema.tables.map((table) => {
    const tableNotes = getTableNotes(notes, table.key);
    const dictionaryTable = dictionaryTables.get(table.key);
    const primaryKeyColumns = getPrimaryKeyColumns(table);
    const reportingExamples = buildTableReportingExamples(versionDictionary, table.key);
    assertGeneratedReportingExamplesSafe(
      versionDictionary,
      reportingExamples,
      `${schema.productKey} ${schema.productVersion} ${table.key} AI table examples`,
      [table.key],
    );

    return {
      productKey: schema.productKey,
      productName: schema.productName,
      version: schema.productVersion,
      objectType: 'table',
      key: table.key,
      schemaName: table.schemaName,
      name: table.name,
      confidence: tableNotes.confidence ?? 'unknown',
      reviewStatus: tableNotes.reviewStatus ?? 'draft',
      summary:
        tableNotes.summary ?? 'Generated from SQL Server metadata. Manual table purpose documentation pending.',
      safeReportingNotes: tableNotes.safeReportingNotes ?? [],
      warnings: tableNotes.warnings ?? [],
      columns: table.columns.map((column) => ({
        name: column.name,
        type: column.typeDefinition ?? column.dataType,
        nullable: column.isNullable,
        primaryKey: primaryKeyColumns.has(column.name),
        purpose:
          getColumnNotes(notes, table.key, column.name).purpose ??
          (primaryKeyColumns.has(column.name)
            ? 'Generated from SQL Server metadata. Primary key column; manual purpose documentation pending.'
            : 'Generated from SQL Server metadata. Manual purpose documentation pending.'),
        confidence: getColumnNotes(notes, table.key, column.name).confidence ?? 'unknown',
      })),
      primaryKeys: (table.keys ?? []).filter((key) => key.type === 'PK'),
      uniqueKeys: (table.keys ?? []).filter((key) => key.type === 'UQ'),
      indexes: table.indexes ?? [],
      outgoingForeignKeys: table.outgoingForeignKeys ?? [],
      incomingForeignKeys: table.incomingForeignKeys ?? [],
      triggers: table.triggers ?? [],
      relationshipSummary: dictionaryTable?.relationships ?? [],
      reportingExamples,
    };
  });
}

function columnRows(schema, notes) {
  return schema.tables.flatMap((table) => {
    const primaryKeyColumns = getPrimaryKeyColumns(table);
    return table.columns.map((column) => {
      const columnNotes = getColumnNotes(notes, table.key, column.name);
      return {
        productKey: schema.productKey,
        productName: schema.productName,
        version: schema.productVersion,
        tableKey: table.key,
        tableName: table.name,
        schemaName: table.schemaName,
        columnName: column.name,
        ordinal: column.ordinal,
        type: column.typeDefinition ?? column.dataType,
        dataType: column.dataType,
        nullable: column.isNullable,
        identity: column.isIdentity,
        computed: column.isComputed,
        rowGuidColumn: column.isRowGuidColumn,
        primaryKey: primaryKeyColumns.has(column.name),
        defaultDefinition: column.defaultDefinition ?? '',
        collationName: column.collationName ?? '',
        confidence: columnNotes.confidence ?? 'unknown',
        purpose:
          columnNotes.purpose ??
          (primaryKeyColumns.has(column.name)
            ? 'Generated from SQL Server metadata. Primary key column; manual purpose documentation pending.'
            : 'Generated from SQL Server metadata. Manual purpose documentation pending.'),
      };
    });
  });
}

function relationshipRows(schema) {
  return (schema.foreignKeys ?? []).map((foreignKey) => ({
    productKey: schema.productKey,
    productName: schema.productName,
    version: schema.productVersion,
    relationshipType: 'foreign_key',
    confidence: 'confirmed',
    name: foreignKey.name,
    sourceTableKey: foreignKey.sourceTableKey,
    referencedTableKey: foreignKey.referencedTableKey,
    columns: foreignKey.columns ?? [],
    deleteAction: foreignKey.deleteAction ?? '',
    updateAction: foreignKey.updateAction ?? '',
    disabled: foreignKey.isDisabled ?? false,
    notTrusted: foreignKey.isNotTrusted ?? false,
  }));
}

function objectRows(schema) {
  return [
    ...(schema.views ?? []).map((object) => ({ objectType: 'view', object })),
    ...(schema.routines ?? []).map((object) => ({ objectType: 'routine', object })),
    ...(schema.triggers ?? []).map((object) => ({ objectType: 'trigger', object })),
  ].map(({ objectType, object }) => {
    const definition = truncateDefinition(object.definition ?? object.objectDefinition ?? '');
    return {
      productKey: schema.productKey,
      productName: schema.productName,
      version: schema.productVersion,
      objectType,
      key: getObjectKey(object),
      schemaName: object.schemaName ?? '',
      name: object.name ?? '',
      parentObjectKey: object.parentObjectKey ?? '',
      type: object.type ?? object.typeDescription ?? object.routineType ?? '',
      typeDescription: object.typeDescription ?? object.routineTypeDescription ?? '',
      dependencies: object.dependencies ?? [],
      ...definition,
    };
  });
}

function dependencyRows(schema) {
  return (schema.dependencies ?? []).map((dependency, index) => ({
    productKey: schema.productKey,
    productName: schema.productName,
    version: schema.productVersion,
    dependencyType: 'sql_expression_dependency',
    index,
    referencingObjectKey: dependency.referencingObjectKey ?? '',
    referencedObjectKey: dependency.referencedObjectKey ?? '',
    referencingSchemaName: dependency.referencingSchemaName ?? '',
    referencingEntityName: dependency.referencingEntityName ?? '',
    referencedSchemaName: dependency.referencedSchemaName ?? '',
    referencedEntityName: dependency.referencedEntityName ?? '',
    referencedDatabaseName: dependency.referencedDatabaseName ?? '',
    referencedServerName: dependency.referencedServerName ?? '',
    isAmbiguous: dependency.isAmbiguous ?? false,
    isCallerDependent: dependency.isCallerDependent ?? false,
    isSelected: dependency.isSelected ?? false,
    isUpdated: dependency.isUpdated ?? false,
    isSelectAll: dependency.isSelectAll ?? false,
  }));
}

function queryContextMarkdown(summary) {
  const lines = [
    `# ${summary.productName} ${summary.version} AI query context`,
    '',
    '## Before answering',
    '',
    'If the user has not specified a product and version, ask for them before generating or reviewing SQL.',
    '',
    'Required context:',
    '',
    ...requiredUserContext.map((item) => `- ${item}`),
    '',
    'Do not assume the SQL Server database name identifies the Laserfiche product or version. Use the selected product/version paths from `catalog.json`.',
    '',
    '## Purpose',
    '',
    'Use this package to help generate and review read-only reporting SQL for the selected Laserfiche product version. It contains schema metadata, relationships, object dependencies, and documentation notes. It does not contain row data.',
    '',
    '## Support boundary',
    '',
    supportWarning,
    '',
    '## AI rules',
    '',
    ...aiRules.map((rule) => `- ${rule}`),
    '',
    '## Snapshot',
    '',
    `- Product: ${summary.productName} (${summary.productKey})`,
    `- Version: ${summary.version}`,
    `- Database role: ${summary.databaseRole || 'Unknown'}`,
    `- Exported at UTC: ${summary.exportedAtUtc || 'Unknown'}`,
    `- Tables: ${summary.counts.tables}`,
    `- Columns: ${summary.counts.columns}`,
    `- Foreign keys: ${summary.counts.foreignKeys}`,
    `- Views: ${summary.counts.views}`,
    `- Routines: ${summary.counts.routines}`,
    `- Triggers: ${summary.counts.triggers}`,
    `- Dependencies: ${summary.counts.dependencies}`,
    '',
    '## Retrieval guidance',
    '',
    '- Start with `tables.jsonl` for table purpose, caveats, keys, and compact column summaries.',
    '- Use `columns.jsonl` when validating SELECT lists, filters, GROUP BY clauses, and aliases.',
    '- Use `relationships.jsonl` for confirmed SQL Server foreign keys.',
    '- Use `dependencies.jsonl` and `objects.jsonl` to review views, routines, triggers, and expression dependencies.',
    '- If a relationship is not in `relationships.jsonl`, describe it as inferred unless separate evidence is provided.',
    '',
    '## Common reporting paths',
    '',
    ...(summary.reportingPaths.length > 0
      ? summary.reportingPaths.flatMap((item) => [
          `### ${item.title}`,
          '',
          item.summary,
          '',
          `Tables: ${item.tables.join(', ')}`,
          '',
        ])
      : ['No product-specific reporting paths are documented yet.', '']),
    '## Common questions',
    '',
    ...(summary.reportingQuestions.length > 0
      ? summary.reportingQuestions.flatMap((item) => [
          `- ${item.question}`,
          `  Guidance: ${item.guidance}`,
          `  Tables: ${item.tables.join(', ')}`,
        ])
      : ['No product-specific reporting questions are documented yet.']),
    '',
    '## Generated examples',
    '',
    ...(summary.generatedReportingExamples.length > 0
      ? summary.generatedReportingExamples.flatMap((example) => [
          `### ${example.title}`,
          '',
          example.note,
          '',
          '```sql',
          example.sql,
          '```',
          '',
        ])
      : ['No generated examples are available for this product/version.', '']),
  ];

  return lines.join('\n');
}

function assistantInstructionsMarkdown(catalog) {
  const products = catalog.products.flatMap((product) =>
    product.versions.map((version) => `- ${product.productName} (${product.productKey}) ${version.version}`),
  );

  const lines = [
    '# FicheBait Schema Reference AI Assistant Instructions',
    '',
    'Use this file as the entry point before generating SQL, reviewing SQL, explaining schema objects, or designing reporting-database objects from the AI export package.',
    '',
    '## Required startup flow',
    '',
    '1. Read `/data/ai/catalog.json`.',
    '2. If the user has not specified a Laserfiche product and product version, ask for them before generating or reviewing SQL.',
    '3. Ask for the task type if it is unclear: create query, review query, create reporting view, create reporting stored procedure, explain schema, or troubleshoot SQL.',
    '4. Load the selected product/version `query-context.md`.',
    '5. Retrieve from that same product/version folder only: `tables.jsonl`, `columns.jsonl`, `relationships.jsonl`, `objects.jsonl`, and `dependencies.jsonl`.',
    '6. Generate or review SQL within the read-only support boundary.',
    '',
    '## Required user context',
    '',
    ...requiredUserContext.map((item) => `- ${item}`),
    '',
    '## Safety boundary',
    '',
    supportWarning,
    '',
    '## AI rules',
    '',
    ...aiRules.map((rule) => `- ${rule}`),
    '',
    '## Product/version selection rules',
    '',
    '- Do not infer product or version from a SQL Server database name.',
    '- Do not mix schemas across products unless the user explicitly asks for a cross-product explanation.',
    '- Do not mix versions unless the user explicitly asks for a version comparison.',
    '- If a requested product/version is not listed in `catalog.json`, say that it has not been imported yet.',
    '',
    '## Available product versions',
    '',
    ...products,
    '',
  ];

  return lines.join('\n');
}

function copyDirectory(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function generate() {
  const productsManifest = readJson(path.join(sourceDataRoot, 'products.json'));
  const sourceOutputRoot = outputRoots[0];
  outputRoots.forEach(emptyDirectory);

  const catalog = {
    exportFormatVersion: '1.0',
    sourceSnapshotMaxExportedAtUtc: '',
    purpose: 'Machine-readable FicheBait Schema Reference export for AI-assisted read-only SQL generation and review.',
    supportWarning,
    aiRules,
    assistantStartupInstructions,
    products: [],
  };

  productsManifest.products
    .filter((product) => product.status !== 'pending')
    .forEach((product) => {
      const manifestRelativePath = normalizeManifestPath(product.manifestUrl);
      const versionsManifest = readJson(path.join(sourceDataRoot, manifestRelativePath));
      const productCatalog = {
        productKey: product.productKey,
        productName: product.productName,
        defaultVersion: versionsManifest.defaultVersion,
        versions: [],
      };

      versionsManifest.versions.forEach((versionEntry) => {
        const schema = readJson(path.join(sourceDataRoot, product.productKey, versionEntry.version, 'schema.json'));
        const notes = readJson(path.join(sourceDataRoot, product.productKey, versionEntry.version, 'notes.json'));
        if (schema.exportedAtUtc && schema.exportedAtUtc > catalog.sourceSnapshotMaxExportedAtUtc) {
          catalog.sourceSnapshotMaxExportedAtUtc = schema.exportedAtUtc;
        }
        const versionDictionary = buildSchemaProduct([{ schema, notes }]).versions[0];
        const summary = summarizeVersion(schema, notes, versionDictionary);
        const versionOutputRoot = path.join(sourceOutputRoot, product.productKey, versionEntry.version);
        const files = {
          summary: 'summary.json',
          tables: 'tables.jsonl',
          columns: 'columns.jsonl',
          relationships: 'relationships.jsonl',
          objects: 'objects.jsonl',
          dependencies: 'dependencies.jsonl',
          queryContext: 'query-context.md',
        };

        writeJson(path.join(versionOutputRoot, files.summary), summary);
        writeJsonl(path.join(versionOutputRoot, files.tables), tableRows(schema, notes, versionDictionary));
        writeJsonl(path.join(versionOutputRoot, files.columns), columnRows(schema, notes));
        writeJsonl(path.join(versionOutputRoot, files.relationships), relationshipRows(schema));
        writeJsonl(path.join(versionOutputRoot, files.objects), objectRows(schema));
        writeJsonl(path.join(versionOutputRoot, files.dependencies), dependencyRows(schema));
        writeText(path.join(versionOutputRoot, files.queryContext), queryContextMarkdown(summary));

        productCatalog.versions.push({
          version: versionEntry.version,
          label: `${product.productName} ${versionEntry.version}`,
          counts: summary.counts,
          files: Object.fromEntries(
            Object.entries(files).map(([key, fileName]) => [key, toPublicAiUrl(product.productKey, versionEntry.version, fileName)]),
          ),
        });
      });

      catalog.products.push(productCatalog);
    });

  writeJson(path.join(sourceOutputRoot, 'catalog.json'), catalog);
  writeText(path.join(sourceOutputRoot, 'assistant-instructions.md'), assistantInstructionsMarkdown(catalog));
  copyDirectory(sourceOutputRoot, outputRoots[1]);

  const versionCount = catalog.products.reduce((total, product) => total + product.versions.length, 0);
  console.log(`Generated AI export package for ${catalog.products.length} products and ${versionCount} versions.`);
  console.log(path.relative(repoRoot, sourceOutputRoot));
  console.log(path.relative(repoRoot, outputRoots[1]));
}

generate();
