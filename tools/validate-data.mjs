import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSchemaSnapshot } from '../src/data/schemaDictionary.js';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function addDuplicateErrors(errors, values, label, scope) {
  const seen = new Set();
  const duplicates = new Set();
  values.filter(Boolean).forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  duplicates.forEach((value) => errors.push(`${scope}: duplicate ${label} "${value}"`));
}

function addDuplicateWarnings(warnings, values, label, scope) {
  const seen = new Set();
  const duplicates = new Set();
  values.filter(Boolean).forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  });
  duplicates.forEach((value) => warnings.push(`${scope}: duplicate ${label} "${value}"`));
}

function normalize(value) {
  return String(value ?? '').toLowerCase().trim();
}

function addAlias(aliasMap, alias, key) {
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias || !key) {
    return;
  }

  const existingKey = aliasMap.get(normalizedAlias);
  aliasMap.set(normalizedAlias, existingKey && existingKey !== key ? null : key);
}

function getObjectLabel(key) {
  return key?.replace(/^dbo\./, '') ?? '';
}

function buildObjectAliasMap(schema) {
  const aliases = new Map();
  [
    ...(schema.tables ?? []).map((object) => ({ ...object, type: 'table' })),
    ...(schema.views ?? []).map((object) => ({ ...object, type: 'view' })),
    ...(schema.routines ?? []).map((object) => ({ ...object, type: 'routine' })),
    ...(schema.triggers ?? []).map((object) => ({
      ...object,
      key: object.name,
      label: object.name,
      type: 'trigger',
    })),
  ].forEach((object) => {
    addAlias(aliases, object.key, object.key);
    addAlias(aliases, object.name, object.key);
    addAlias(aliases, object.label, object.key);
    addAlias(aliases, getObjectLabel(object.key), object.key);
  });
  return aliases;
}

function resolveDependencyKey(dependency, prefix, aliases) {
  const objectKey = dependency[`${prefix}ObjectKey`];
  const schemaName = dependency[`${prefix}SchemaName`];
  const entityName = dependency[`${prefix}EntityName`];
  const candidates = [
    objectKey,
    schemaName && entityName ? `${schemaName}.${entityName}` : '',
    entityName,
  ];

  for (const candidate of candidates) {
    const resolvedKey = aliases.get(normalize(candidate));
    if (resolvedKey) {
      return resolvedKey;
    }
  }

  return '';
}

function validateProductManifest(publicRoot, productsManifest, errors) {
  if (!productsManifest.defaultProduct) {
    errors.push('products.json: missing defaultProduct');
  }
  if (!Array.isArray(productsManifest.products) || productsManifest.products.length === 0) {
    errors.push('products.json: products must be a non-empty array');
    return;
  }

  addDuplicateErrors(
    errors,
    productsManifest.products.map((product) => product.productKey),
    'product key',
    'products.json',
  );

  productsManifest.products.forEach((product) => {
    if (product.status === 'pending') {
      return;
    }
    if (!product.productKey || !product.productName || !product.manifestUrl) {
      errors.push(`products.json: product entry is missing productKey, productName, or manifestUrl`);
      return;
    }

    const versionsPath = path.join(publicRoot, product.manifestUrl.replace(/^\/?data\//, 'data/'));
    if (!fs.existsSync(versionsPath)) {
      errors.push(`${product.productKey}: missing versions file ${versionsPath}`);
    }
  });
}

function validateSchemaReferences(schema, scope, errors, warnings, dependencyStats) {
  const tableKeys = new Set((schema.tables ?? []).map((table) => table.key));
  const objectKeys = new Set([
    ...tableKeys,
    ...(schema.views ?? []).map((view) => view.key),
    ...(schema.routines ?? []).map((routine) => routine.key),
    ...(schema.triggers ?? []).map((trigger) => trigger.name),
  ]);
  const aliases = buildObjectAliasMap(schema);

  addDuplicateErrors(errors, [...tableKeys], 'table key', scope);
  addDuplicateErrors(errors, (schema.views ?? []).map((view) => view.key), 'view key', scope);
  addDuplicateErrors(errors, (schema.routines ?? []).map((routine) => routine.key), 'routine key', scope);
  addDuplicateErrors(errors, (schema.foreignKeys ?? []).map((foreignKey) => foreignKey.name), 'foreign key name', scope);
  addDuplicateWarnings(
    warnings,
    [
      ...(schema.tables ?? []).map((table) => table.name),
      ...(schema.views ?? []).map((view) => view.name),
      ...(schema.routines ?? []).map((routine) => routine.name),
      ...(schema.triggers ?? []).map((trigger) => trigger.name),
    ].map(normalize),
    'unqualified object name',
    scope,
  );

  if ((schema.views ?? []).length === 0) {
    warnings.push(`${scope}: views export is empty; confirm the source database had no exported views`);
  }
  if ((schema.triggers ?? []).length === 0) {
    warnings.push(`${scope}: triggers export is empty; confirm the source database had no exported triggers`);
  }

  (schema.tables ?? []).forEach((table) => {
    if ((table.columns ?? []).length === 0) {
      warnings.push(`${scope}: table "${table.key}" has zero exported columns`);
    }
    const hasPrimaryKey = (table.keys ?? []).some((key) =>
      key.type === 'PK' || key.typeDescription?.toLowerCase().includes('primary'),
    );
    if (!hasPrimaryKey) {
      warnings.push(`${scope}: table "${table.key}" has no exported primary key`);
    }
  });

  (schema.foreignKeys ?? []).forEach((foreignKey) => {
    if (!tableKeys.has(foreignKey.sourceTableKey)) {
      warnings.push(`${scope}: foreign key "${foreignKey.name}" source table missing: ${foreignKey.sourceTableKey}`);
      errors.push(`${scope}: foreign key "${foreignKey.name}" source table missing: ${foreignKey.sourceTableKey}`);
    }
    if (!tableKeys.has(foreignKey.referencedTableKey)) {
      warnings.push(`${scope}: foreign key "${foreignKey.name}" referenced table missing: ${foreignKey.referencedTableKey}`);
      errors.push(`${scope}: foreign key "${foreignKey.name}" referenced table missing: ${foreignKey.referencedTableKey}`);
    }
  });

  const stats = {
    total: 0,
    resolved: 0,
    unresolvedReferencing: 0,
    unresolvedReferenced: 0,
    ambiguousOrMissingAliases: 0,
  };

  (schema.dependencies ?? []).forEach((dependency, index) => {
    stats.total += 1;
    if (!dependency.referencingSchemaName || !dependency.referencedSchemaName) {
      warnings.push(`${scope}: dependency ${index} is missing referencing or referenced schema metadata`);
    }
    const referencingKey = resolveDependencyKey(dependency, 'referencing', aliases);
    const referencedKey = resolveDependencyKey(dependency, 'referenced', aliases);
    if (!referencingKey || !objectKeys.has(referencingKey)) {
      stats.unresolvedReferencing += 1;
      warnings.push(`${scope}: dependency ${index} referencing object not exported: ${dependency.referencingObjectKey}`);
    }
    if (!referencedKey || !objectKeys.has(referencedKey)) {
      stats.unresolvedReferenced += 1;
      warnings.push(`${scope}: dependency ${index} referenced object not exported: ${dependency.referencedObjectKey}`);
    }
    if (referencingKey && referencedKey && objectKeys.has(referencingKey) && objectKeys.has(referencedKey)) {
      stats.resolved += 1;
    }
    if ((dependency.referencingObjectKey && !referencingKey) || (dependency.referencedObjectKey && !referencedKey)) {
      stats.ambiguousOrMissingAliases += 1;
    }
  });
  dependencyStats[scope] = stats;
}

export function validateDataReport({ publicRoot = 'public' } = {}) {
  const errors = [];
  const warnings = [];
  const warningsByScope = {};
  const dependencyStats = {};
  const addWarning = (scope, warning) => {
    warnings.push(warning);
    warningsByScope[scope] = warningsByScope[scope] ?? [];
    warningsByScope[scope].push(warning);
  };
  const productsPath = path.join(publicRoot, 'data', 'products.json');
  const productsManifest = readJson(productsPath);
  validateProductManifest(publicRoot, productsManifest, errors);

  productsManifest.products
    .filter((product) => product.status !== 'pending')
    .forEach((product) => {
      const versionsPath = path.join(publicRoot, product.manifestUrl.replace(/^\/?data\//, 'data/'));
      if (!fs.existsSync(versionsPath)) {
        return;
      }

      const versionsManifest = readJson(versionsPath);
      addDuplicateErrors(
        errors,
        versionsManifest.versions?.map((version) => version.version) ?? [],
        'version',
        product.productKey,
      );
      if (!versionsManifest.defaultVersion) {
        errors.push(`${product.productKey}: versions file is missing defaultVersion`);
      }

      (versionsManifest.versions ?? []).forEach((version) => {
        const schemaPath = path.join(publicRoot, version.schemaUrl.replace(/^\/?data\//, 'data/'));
        const notesPath = path.join(publicRoot, version.notesUrl.replace(/^\/?data\//, 'data/'));
        const scope = `${product.productKey} ${version.version}`;

        if (!fs.existsSync(schemaPath)) {
          errors.push(`${scope}: missing schema ${schemaPath}`);
          return;
        }
        if (!fs.existsSync(notesPath)) {
          errors.push(`${scope}: missing notes ${notesPath}`);
        }

        const schema = readJson(schemaPath);
        validateSchemaSnapshot(schema).forEach((error) => errors.push(`${scope}: ${error}`));
        if (schema.productKey !== product.productKey) {
          errors.push(`${scope}: schema productKey "${schema.productKey}" does not match manifest key`);
        }
        if (schema.productVersion !== version.version) {
          errors.push(`${scope}: schema productVersion "${schema.productVersion}" does not match manifest version`);
        }
        const scopedWarnings = [];
        validateSchemaReferences(schema, scope, errors, scopedWarnings, dependencyStats);
        scopedWarnings.forEach((warning) => addWarning(scope, warning));
      });
    });

  if (path.resolve(publicRoot) === path.resolve('public')) {
    const baselinePath = path.join(process.cwd(), 'tools', 'data-warning-baseline.json');
    if (!fs.existsSync(baselinePath)) {
      errors.push('Missing tools/data-warning-baseline.json.');
    } else {
      const baseline = readJson(baselinePath);
      const baselineScopes = baseline.warningsByScope ?? {};
      for (const [scope, scopeWarnings] of Object.entries(warningsByScope)) {
        if (!(scope in baselineScopes)) {
          errors.push(`${scope}: warning baseline is missing; review this new snapshot and update data-warning-baseline.json`);
        } else if (scopeWarnings.length > baselineScopes[scope]) {
          errors.push(
            `${scope}: data warnings increased from ${baselineScopes[scope]} to ${scopeWarnings.length}; review the new warnings before updating the baseline`,
          );
        }
      }
      for (const scope of Object.keys(baselineScopes)) {
        if (!(scope in warningsByScope)) {
          errors.push(`${scope}: warning baseline is stale because the snapshot is no longer present`);
        }
      }
    }
  }

  return { errors, warnings, warningsByScope, dependencyStats };
}

export function validateData(options) {
  const { errors } = validateDataReport(options);
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const asJson = process.argv.includes('--json');
  const { errors, warnings, warningsByScope, dependencyStats } = validateDataReport();
  if (asJson) {
    console.log(JSON.stringify({ errors, warnings, warningsByScope, dependencyStats }, null, 2));
  }
  if (errors.length > 0) {
    if (!asJson) {
      console.error(errors.join('\n'));
    }
    process.exitCode = 1;
  } else if (!asJson) {
    const resolved = Object.values(dependencyStats).reduce((total, stats) => total + stats.resolved, 0);
    const total = Object.values(dependencyStats).reduce((sum, stats) => sum + stats.total, 0);
    console.log(
      warnings.length > 0
        ? `Data validation passed with ${warnings.length} data quality warnings. Resolved ${resolved} of ${total} dependency references.`
        : `Data validation passed. Resolved ${resolved} of ${total} dependency references.`,
    );
  }
}
