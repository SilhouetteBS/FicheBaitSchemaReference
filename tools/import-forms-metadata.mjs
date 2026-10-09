import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import { validateSchemaSnapshot } from '../src/data/schemaDictionary.js';

const defaultInputDir = path.join(os.homedir(), 'Downloads');
const defaultInputs = {
  manifest: path.join(defaultInputDir, 'manifest.json'),
  schemas: path.join(defaultInputDir, 'schemas.json'),
  tables: path.join(defaultInputDir, 'tables.json'),
  columns: path.join(defaultInputDir, 'columns.json'),
  keys: path.join(defaultInputDir, 'primaryAndUniqueKeys.json'),
  foreignKeys: path.join(defaultInputDir, 'foreignKeys.json'),
  indexes: path.join(defaultInputDir, 'indexes.json'),
  views: path.join(defaultInputDir, 'views.json'),
  routines: path.join(defaultInputDir, 'routines.json'),
  triggers: path.join(defaultInputDir, 'triggers.json'),
  dependencies: path.join(defaultInputDir, 'dependencies.json'),
};

function readJsonResultSet(filePath) {
  return parseExportJson(fs.readFileSync(filePath, 'utf8'));
}

export function parseExportJson(input) {
  const text = cleanJsonText(input.replace(/^\uFEFF/, ''));
  try { return JSON.parse(text); } catch (originalError) {
    try { return JSON.parse(text.replace(/\r?\n/g, '')); } catch { /* Try quoted SSMS records next. */ }
    // SSMS can split FOR JSON output into one-column CSV records.
    try {
      const rows = parse(text, { bom: true, skip_empty_lines: true, relax_column_count: false });
      if (!rows.every((row) => row.length === 1)) throw originalError;
      if (/^(?:JSON_|\(No column name\))/i.test(rows[0]?.[0] ?? '')) rows.shift();
      return JSON.parse(rows.map((row) => row[0]).join(''));
    } catch {
      throw new Error(`Invalid JSON export: ${originalError.message}`);
    }
  }
}

function readOptionalJsonResultSet(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return readJsonResultSet(filePath);
}

function readJsonOrTabRows(filePath, columns) {
  const raw = cleanJsonText(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim());
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[')) {
    return parseExportJson(raw);
  }
  if (raw.startsWith('"') || raw.startsWith('JSON_')) return parseExportJson(raw);

  return raw.split(/\r?\n/).map((line) => {
    const values = line.split('\t');
    return Object.fromEntries(
      columns.map((column, index) => {
        const value = values[index];
        return [column.name, column.type === 'json' ? JSON.parse(value) : value];
      }),
    );
  });
}

function cleanJsonText(value) {
  const text = value.trim();
  if ((text.startsWith("'[") || text.startsWith("'{")) && text.endsWith("'")) {
    return text.slice(1, -1);
  }
  if ((text.startsWith('[') || text.startsWith('{')) && text.endsWith("'")) {
    return text.slice(0, -1);
  }
  return text;
}

function getOption(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for --${name}`);
  return value;
}

function hasOption(name) {
  return process.argv.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
}

function validatePathSegment(value, label, pattern) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`${label} contains unsupported path characters: ${JSON.stringify(value)}`);
  }
}

function resolveInside(root, ...segments) {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Resolved output path escapes ${resolvedRoot}: ${resolvedPath}`);
  }
  return resolvedPath;
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temporaryPath, filePath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

function byName(left, right) {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function cleanObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null),
  );
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function isSysdiagramsKey(value) {
  return String(value ?? '').toLowerCase() === 'dbo.sysdiagrams';
}

function isSysdiagramsObject(object) {
  return isSysdiagramsKey(object?.tableKey)
    || (String(object?.schemaName ?? '').toLowerCase() === 'dbo'
      && String(object?.tableName ?? '').toLowerCase() === 'sysdiagrams');
}

function referencesSysdiagrams(dependency) {
  return [
    dependency?.referencingObjectKey,
    dependency?.referencedObjectKey,
  ].some(isSysdiagramsKey)
    || (
      String(dependency?.referencedSchemaName ?? '').toLowerCase() === 'dbo'
      && String(dependency?.referencedEntityName ?? '').toLowerCase() === 'sysdiagrams'
    );
}

export function normalizeSchema({
  manifest,
  schemas,
  tables,
  columns,
  keys,
  foreignKeys,
  indexes,
  views,
  routines,
  triggers,
  dependencies,
}) {
  const filteredTables = tables.filter((table) => !isSysdiagramsObject(table));
  const exportedTableKeys = new Set(filteredTables.map((table) => table.tableKey));
  const filteredColumns = columns.filter((column) => exportedTableKeys.has(column.tableKey));
  const filteredKeys = keys.filter((key) => exportedTableKeys.has(key.tableKey));
  const filteredIndexes = indexes.filter((index) => exportedTableKeys.has(index.tableKey));
  const filteredForeignKeys = foreignKeys.filter((foreignKey) =>
    exportedTableKeys.has(foreignKey.sourceTableKey) && exportedTableKeys.has(foreignKey.referencedTableKey),
  );
  const filteredTriggers = triggers.filter((trigger) => !isSysdiagramsKey(trigger.parentObjectKey));
  const filteredDependencies = dependencies.filter((dependency) => !referencesSysdiagrams(dependency));

  const columnsByTable = new Map();
  for (const column of filteredColumns) {
    const normalizedColumn = {
      name: column.columnName,
      ordinal: column.ordinal,
      dataType: column.dataType,
      typeDefinition: column.typeDefinition,
      maxLength: column.maxLength,
      precision: column.precision,
      scale: column.scale,
      isNullable: column.isNullable,
      isIdentity: column.isIdentity,
      isComputed: column.isComputed,
      isRowGuidColumn: column.isRowGuidColumn,
      defaultDefinition: column.defaultDefinition,
      computedDefinition: column.computedDefinition,
      collationName: column.collationName,
    };

    const tableColumns = columnsByTable.get(column.tableKey) ?? [];
    tableColumns.push(cleanObject(normalizedColumn));
    columnsByTable.set(column.tableKey, tableColumns);
  }

  const keysByTable = new Map();
  for (const key of filteredKeys) {
    const tableKeys = keysByTable.get(key.tableKey) ?? [];
    tableKeys.push({
      name: key.constraintName,
      type: key.constraintType,
      typeDescription: key.constraintTypeDescription,
      backingIndexName: key.backingIndexName,
      columns: key.columns,
    });
    keysByTable.set(key.tableKey, tableKeys);
  }

  const foreignKeysBySourceTable = groupBy(filteredForeignKeys, (foreignKey) => foreignKey.sourceTableKey);
  const foreignKeysByReferencedTable = groupBy(filteredForeignKeys, (foreignKey) => foreignKey.referencedTableKey);
  const indexesByTable = groupBy(filteredIndexes, (index) => index.tableKey);
  const triggersByParent = groupBy(filteredTriggers, (trigger) => trigger.parentObjectKey);
  const dependenciesByReferencingObject = groupBy(filteredDependencies, (dependency) => dependency.referencingObjectKey);

  const normalizedForeignKeys = filteredForeignKeys.map((foreignKey) => ({
    name: foreignKey.foreignKeyName,
    sourceTableKey: foreignKey.sourceTableKey,
    referencedTableKey: foreignKey.referencedTableKey,
    deleteAction: foreignKey.deleteAction,
    updateAction: foreignKey.updateAction,
    isDisabled: foreignKey.isDisabled,
    isNotTrusted: foreignKey.isNotTrusted,
    columns: foreignKey.columns,
  }));

  return {
    exportFormatVersion: manifest.exportFormatVersion,
    productKey: manifest.productKey,
    productName: manifest.productName,
    productVersion: manifest.productVersion,
    databaseRole: manifest.databaseRole,
    exportedAtUtc: manifest.exportedAtUtc,
    schemas: schemas
      .map((schema) => ({ name: schema.schemaName }))
      .sort((left, right) => byName(left.name, right.name)),
    tables: filteredTables
      .map((table) => ({
        key: table.tableKey,
        schemaName: table.schemaName,
        name: table.tableName,
        columns: (columnsByTable.get(table.tableKey) ?? []).sort((left, right) => left.ordinal - right.ordinal),
        keys: (keysByTable.get(table.tableKey) ?? []).sort((left, right) => byName(left.name, right.name)),
        outgoingForeignKeys: (foreignKeysBySourceTable.get(table.tableKey) ?? []).map((foreignKey) => ({
          name: foreignKey.foreignKeyName,
          referencedTableKey: foreignKey.referencedTableKey,
          deleteAction: foreignKey.deleteAction,
          updateAction: foreignKey.updateAction,
          isDisabled: foreignKey.isDisabled,
          isNotTrusted: foreignKey.isNotTrusted,
          columns: foreignKey.columns,
        })),
        incomingForeignKeys: (foreignKeysByReferencedTable.get(table.tableKey) ?? []).map((foreignKey) => ({
          name: foreignKey.foreignKeyName,
          sourceTableKey: foreignKey.sourceTableKey,
          deleteAction: foreignKey.deleteAction,
          updateAction: foreignKey.updateAction,
          isDisabled: foreignKey.isDisabled,
          isNotTrusted: foreignKey.isNotTrusted,
          columns: foreignKey.columns,
        })),
        indexes: (indexesByTable.get(table.tableKey) ?? []).map((index) => ({
          name: index.indexName,
          typeDescription: index.indexTypeDescription,
          isUnique: index.isUnique,
          isPrimaryKey: index.isPrimaryKey,
          isUniqueConstraint: index.isUniqueConstraint,
          hasFilter: index.hasFilter,
          filterDefinition: index.filterDefinition,
          columns: index.columns,
        })),
        triggers: (triggersByParent.get(table.tableKey) ?? []).map((trigger) => ({
          name: trigger.triggerName,
          isDisabled: trigger.isDisabled,
          isInsteadOfTrigger: trigger.isInsteadOfTrigger,
          definitionSha256: trigger.definitionSha256,
        })),
      }))
      .sort((left, right) => byName(left.key, right.key)),
    foreignKeys: normalizedForeignKeys,
    views: views.map((view) => ({
      key: view.viewKey,
      schemaName: view.schemaName,
      name: view.viewName,
      definitionSha256: view.definitionSha256,
      dependencies: dependenciesByReferencingObject.get(view.viewKey) ?? [],
    })),
    routines: routines.map((routine) => ({
      key: routine.routineKey,
      schemaName: routine.schemaName,
      name: routine.routineName,
      type: routine.routineType,
      typeDescription: routine.routineTypeDescription,
      definitionSha256: routine.definitionSha256,
      parameters: routine.parameters ?? [],
      dependencies: dependenciesByReferencingObject.get(routine.routineKey) ?? [],
    })),
    triggers: filteredTriggers.map((trigger) => ({
      name: trigger.triggerName,
      parentObjectKey: trigger.parentObjectKey,
      parentObjectTypeDescription: trigger.parentObjectTypeDescription,
      isDisabled: trigger.isDisabled,
      isInsteadOfTrigger: trigger.isInsteadOfTrigger,
      definitionSha256: trigger.definitionSha256,
    })),
    dependencies: filteredDependencies.map((dependency) =>
      cleanObject({
        referencingObjectKey: dependency.referencingObjectKey,
        referencingObjectTypeDescription: dependency.referencingObjectTypeDescription,
        referencedObjectKey: dependency.referencedObjectKey,
        referencedSchemaName: dependency.referencedSchemaName,
        referencedEntityName: dependency.referencedEntityName,
        referencedObjectTypeDescription: dependency.referencedObjectTypeDescription,
        isSchemaBoundReference: dependency.isSchemaBoundReference,
        isCallerDependent: dependency.isCallerDependent,
        isAmbiguous: dependency.isAmbiguous,
      }),
    ),
  };
}

export function runImport() {
  const inputDir = getOption('input-dir', defaultInputDir);
  const resolvedDefaultInputs = { ...defaultInputs };
  for (const key of Object.keys(resolvedDefaultInputs)) {
    const basename = path.basename(resolvedDefaultInputs[key]);
    const files = fs.readdirSync(inputDir);
    const product = getOption('product', '').toLowerCase();
    const candidates = files.filter((file) => file.toLowerCase() === basename.toLowerCase()
      || (file.toLowerCase().endsWith(`_${basename.toLowerCase()}`)
        && (!product || file.toLowerCase() === `${product}_${basename.toLowerCase()}`)));
    if (candidates.length > 1 && !hasOption(key)) {
      throw new Error(`Ambiguous ${basename}: ${candidates.join(', ')}. Specify --${key} or --product.`);
    }
    resolvedDefaultInputs[key] = path.join(inputDir, candidates[0] ?? basename);
  }

  const inputs = Object.fromEntries(
    Object.entries(resolvedDefaultInputs).map(([key, defaultInput]) => [key, getOption(key, defaultInput)]),
  );
  const manifest = readJsonResultSet(inputs.manifest);
  const schemas = readJsonResultSet(inputs.schemas);
  const tables = readJsonResultSet(inputs.tables);
  const columns = readJsonResultSet(inputs.columns);
  const keys = readJsonOrTabRows(inputs.keys, [
    { name: 'schemaName' },
    { name: 'tableName' },
    { name: 'tableKey' },
    { name: 'constraintName' },
    { name: 'constraintType' },
    { name: 'constraintTypeDescription' },
    { name: 'backingIndexName' },
    { name: 'columns', type: 'json' },
  ]);
  const foreignKeys = readJsonResultSet(inputs.foreignKeys);
  const indexes = readJsonResultSet(inputs.indexes);
  const views = readOptionalJsonResultSet(inputs.views);
  const routines = readJsonResultSet(inputs.routines);
  const triggers = readOptionalJsonResultSet(inputs.triggers);
  const dependencies = readJsonResultSet(inputs.dependencies);
  const normalizedManifest = {
    ...manifest,
    productKey: getOption('product', manifest.productKey),
    productName: getOption('product-name', manifest.productName),
    databaseRole: getOption('database-role', manifest.databaseRole),
  };

  const schema = normalizeSchema({
    manifest: normalizedManifest,
    schemas,
    tables,
    columns,
    keys,
    foreignKeys,
    indexes,
    views,
    routines,
    triggers,
    dependencies,
  });
  validatePathSegment(schema.productKey, 'productKey', /^[a-z0-9][a-z0-9-]*$/);
  validatePathSegment(schema.productVersion, 'productVersion', /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
  const schemaErrors = validateSchemaSnapshot(schema);
  if (schemaErrors.length > 0) {
    throw new Error(`Normalized schema failed validation: ${schemaErrors.join(' ')}`);
  }

  const outputDir = hasOption('out')
    ? getOption('out', '')
    : resolveInside('data', schema.productKey, schema.productVersion);
  const outputPath = path.join(outputDir, 'schema.json');
  const publicOutputDir = hasOption('public-out')
    ? getOption('public-out', '')
    : resolveInside(path.join('public', 'data'), schema.productKey, schema.productVersion);
  const publicOutputPath = path.join(publicOutputDir, 'schema.json');
  const notesPath = path.join(outputDir, 'notes.json');
  const publicNotesPath = path.join(publicOutputDir, 'notes.json');
  const publicVersionsPath = hasOption('public-versions-out')
    ? getOption('public-versions-out', '')
    : resolveInside('data', schema.productKey, 'versions.json');
  const publicProductsPath = hasOption('public-products-out')
    ? getOption('public-products-out', '')
    : resolveInside('data', 'products.json');

  const emptyNotes = {
    productKey: schema.productKey,
    productVersion: schema.productVersion,
    tables: {},
  };

  const existingVersions = fs.existsSync(publicVersionsPath)
    ? JSON.parse(fs.readFileSync(publicVersionsPath, 'utf8'))
    : {
        productKey: schema.productKey,
        productName: schema.productName,
        defaultVersion: schema.productVersion,
        versions: [],
      };
  const versionEntry = {
    version: schema.productVersion,
    label: `${schema.productName} ${schema.productVersion}`,
    schemaUrl: `/data/${schema.productKey}/${schema.productVersion}/schema.json`,
    notesUrl: `/data/${schema.productKey}/${schema.productVersion}/notes.json`,
  };
  const nextVersions = [
    ...existingVersions.versions.filter((version) => version.version !== schema.productVersion),
    versionEntry,
  ].sort((left, right) => left.version.localeCompare(right.version, undefined, { numeric: true }));
  const existingProducts = fs.existsSync(publicProductsPath)
    ? JSON.parse(fs.readFileSync(publicProductsPath, 'utf8'))
    : {
        defaultProduct: schema.productKey,
        products: [],
      };
  const productEntry = {
    productKey: schema.productKey,
    productName: schema.productName,
    manifestUrl: `/data/${schema.productKey}/versions.json`,
    status: 'available',
  };
  const nextProducts = [
    ...existingProducts.products.filter((product) => product.productKey !== schema.productKey),
    productEntry,
  ].sort((left, right) => left.productName.localeCompare(right.productName, undefined, { sensitivity: 'base' }));

  writeJsonAtomic(outputPath, schema);
  writeJsonAtomic(publicOutputPath, schema);
  if (!fs.existsSync(notesPath)) {
    writeJsonAtomic(notesPath, emptyNotes);
  }
  if (!fs.existsSync(publicNotesPath)) {
    writeJsonAtomic(publicNotesPath, JSON.parse(fs.readFileSync(notesPath, 'utf8')));
  }
  writeJsonAtomic(publicVersionsPath, {
    ...existingVersions,
    productKey: schema.productKey,
    productName: schema.productName,
    defaultVersion: nextVersions.at(-1)?.version ?? schema.productVersion,
    versions: nextVersions,
  });
  writeJsonAtomic(publicProductsPath, {
    ...existingProducts,
    defaultProduct: existingProducts.defaultProduct ?? schema.productKey,
    products: nextProducts,
  });

  console.log(`Imported ${schema.productName} ${schema.productVersion}`);
  console.log(`Schemas: ${schema.schemas.length}`);
  console.log(`Tables: ${schema.tables.length}`);
  console.log(`Columns: ${schema.tables.reduce((total, table) => total + table.columns.length, 0)}`);
  console.log(`Keys: ${schema.tables.reduce((total, table) => total + table.keys.length, 0)}`);
  console.log(`Foreign keys: ${schema.foreignKeys.length}`);
  console.log(`Indexes: ${schema.tables.reduce((total, table) => total + table.indexes.length, 0)}`);
  console.log(`Views: ${schema.views.length}`);
  console.log(`Routines: ${schema.routines.length}`);
  console.log(`Triggers: ${schema.triggers.length}`);
  console.log(`Dependencies: ${schema.dependencies.length}`);
  console.log(outputPath);
  console.log(publicOutputPath);
  console.log(publicVersionsPath);

  return schema;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runImport();
}
