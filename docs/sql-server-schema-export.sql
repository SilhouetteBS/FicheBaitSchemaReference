/*
  Laserfiche product SQL Server metadata export

  Purpose:
    Export schema metadata for the static FicheBait Schema Reference site.

  Safety:
    - Reads SQL Server catalog metadata only.
    - Does not read business table rows.
    - Does not modify the database.

  Identity:
    Database names are user/environment-specific and must not be used as product
    or version identifiers. Set @ProductKey and @ProductVersion explicitly.

  Usage:
    1. Connect to the target Laserfiche product database.
    2. Set @ProductKey, @ProductName, @ProductVersion, and @DatabaseRole below.
    3. Run the script.
    4. Save each JSON result set for import.

  Compatibility:
    Requires SQL Server 2016 or newer for FOR JSON output.
    dbo.sysdiagrams is excluded because it is created by SSMS database diagrams,
    not by Laserfiche product installs.
*/

SET NOCOUNT ON;

DECLARE @ExportFormatVersion nvarchar(20) = N'1.0';
DECLARE @ProductKey nvarchar(50) = N'REPLACE_WITH_PRODUCT_KEY';
DECLARE @ProductName nvarchar(100) = N'REPLACE_WITH_PRODUCT_NAME';
DECLARE @ProductVersion nvarchar(50) = N'REPLACE_WITH_PRODUCT_VERSION';
DECLARE @DatabaseRole nvarchar(50) = N'REPLACE_WITH_DATABASE_ROLE';
DECLARE @ExportedAtUtc datetime2(0) = SYSUTCDATETIME();

-- Definitions can expose implementation details. Keep off unless needed for
-- dependency analysis or internal documentation.
DECLARE @IncludeModuleDefinitions bit = 0;

/* Result set 1: export manifest */
SELECT
  @ExportFormatVersion AS exportFormatVersion,
  @ProductKey AS productKey,
  @ProductName AS productName,
  @ProductVersion AS productVersion,
  @DatabaseRole AS databaseRole,
  @ExportedAtUtc AS exportedAtUtc,
  JSON_QUERY(N'[
    "manifest",
    "schemas",
    "tables",
    "columns",
    "primaryAndUniqueKeys",
    "foreignKeys",
    "indexes",
    "views",
    "routines",
    "triggers",
    "dependencies"
  ]') AS resultSets
FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;

/* Result set 2: schemas */
SELECT
  s.name AS schemaName,
  s.schema_id AS sourceSchemaId,
  USER_NAME(s.principal_id) AS ownerName
FROM sys.schemas s
WHERE s.name NOT IN (N'sys', N'INFORMATION_SCHEMA')
ORDER BY s.name
FOR JSON PATH;

/* Result set 3: tables */
SELECT
  s.name AS schemaName,
  t.name AS tableName,
  CONCAT(s.name, N'.', t.name) AS tableKey,
  t.object_id AS sourceObjectId,
  t.create_date AS createdAt,
  t.modify_date AS modifiedAt,
  ISNULL(rowCounts.rowCountEstimate, 0) AS rowCountEstimate,
  CAST(t.is_memory_optimized AS bit) AS isMemoryOptimized,
  CAST(t.temporal_type AS int) AS temporalType,
  t.temporal_type_desc AS temporalTypeDescription,
  ep.value AS description
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
LEFT JOIN (
  SELECT
    p.object_id,
    SUM(p.rows) AS rowCountEstimate
  FROM sys.partitions p
  WHERE p.index_id IN (0, 1)
  GROUP BY p.object_id
) rowCounts ON rowCounts.object_id = t.object_id
LEFT JOIN sys.extended_properties ep
  ON ep.major_id = t.object_id
  AND ep.minor_id = 0
  AND ep.name = N'MS_Description'
WHERE t.is_ms_shipped = 0
  AND NOT (s.name = N'dbo' AND t.name = N'sysdiagrams')
ORDER BY s.name, t.name
FOR JSON PATH;

/* Result set 4: columns */
SELECT
  s.name AS schemaName,
  t.name AS tableName,
  CONCAT(s.name, N'.', t.name) AS tableKey,
  c.name AS columnName,
  c.column_id AS ordinal,
  ty.name AS dataType,
  CASE
    WHEN ty.name IN (N'nchar', N'nvarchar') AND c.max_length > 0 THEN c.max_length / 2
    WHEN ty.name IN (N'char', N'varchar', N'binary', N'varbinary') THEN c.max_length
    WHEN c.max_length = -1 THEN -1
    ELSE NULL
  END AS maxLength,
  c.precision,
  c.scale,
  CONCAT(
    ty.name,
    CASE
      WHEN ty.name IN (N'nchar', N'nvarchar') AND c.max_length > 0 THEN CONCAT(N'(', c.max_length / 2, N')')
      WHEN ty.name IN (N'char', N'varchar', N'binary', N'varbinary') AND c.max_length > 0 THEN CONCAT(N'(', c.max_length, N')')
      WHEN ty.name IN (N'nchar', N'nvarchar', N'char', N'varchar', N'binary', N'varbinary') AND c.max_length = -1 THEN N'(max)'
      WHEN ty.name IN (N'decimal', N'numeric') THEN CONCAT(N'(', c.precision, N',', c.scale, N')')
      WHEN ty.name IN (N'datetime2', N'datetimeoffset', N'time') THEN CONCAT(N'(', c.scale, N')')
      ELSE N''
    END
  ) AS typeDefinition,
  c.collation_name AS collationName,
  CAST(c.is_nullable AS bit) AS isNullable,
  CAST(c.is_identity AS bit) AS isIdentity,
  CAST(c.is_computed AS bit) AS isComputed,
  CAST(c.is_rowguidcol AS bit) AS isRowGuidColumn,
  dc.name AS defaultConstraintName,
  dc.definition AS defaultDefinition,
  cc.definition AS computedDefinition,
  ep.value AS description
FROM sys.columns c
JOIN sys.tables t ON t.object_id = c.object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
LEFT JOIN sys.default_constraints dc
  ON dc.parent_object_id = c.object_id
  AND dc.parent_column_id = c.column_id
LEFT JOIN sys.computed_columns cc
  ON cc.object_id = c.object_id
  AND cc.column_id = c.column_id
LEFT JOIN sys.extended_properties ep
  ON ep.major_id = c.object_id
  AND ep.minor_id = c.column_id
  AND ep.name = N'MS_Description'
WHERE t.is_ms_shipped = 0
  AND NOT (s.name = N'dbo' AND t.name = N'sysdiagrams')
ORDER BY s.name, t.name, c.column_id
FOR JSON PATH;

/* Result set 5: primary and unique keys */
SELECT
  s.name AS schemaName,
  t.name AS tableName,
  CONCAT(s.name, N'.', t.name) AS tableKey,
  kc.name AS constraintName,
  kc.type AS constraintType,
  kc.type_desc AS constraintTypeDescription,
  i.name AS backingIndexName,
  JSON_QUERY((
    SELECT
      c.name AS columnName,
      ic.key_ordinal AS ordinal,
      CAST(ic.is_descending_key AS bit) AS isDescending
    FROM sys.index_columns ic
    JOIN sys.columns c
      ON c.object_id = ic.object_id
      AND c.column_id = ic.column_id
    WHERE ic.object_id = kc.parent_object_id
      AND ic.index_id = kc.unique_index_id
      AND ic.key_ordinal > 0
    ORDER BY ic.key_ordinal
    FOR JSON PATH
  )) AS columns
FROM sys.key_constraints kc
JOIN sys.tables t ON t.object_id = kc.parent_object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.indexes i
  ON i.object_id = kc.parent_object_id
  AND i.index_id = kc.unique_index_id
WHERE t.is_ms_shipped = 0
  AND NOT (s.name = N'dbo' AND t.name = N'sysdiagrams')
ORDER BY s.name, t.name, kc.type, kc.name
FOR JSON PATH;

/* Result set 6: foreign keys */
SELECT
  fk.name AS foreignKeyName,
  sourceSchema.name AS sourceSchemaName,
  sourceTable.name AS sourceTableName,
  CONCAT(sourceSchema.name, N'.', sourceTable.name) AS sourceTableKey,
  referencedSchema.name AS referencedSchemaName,
  referencedTable.name AS referencedTableName,
  CONCAT(referencedSchema.name, N'.', referencedTable.name) AS referencedTableKey,
  fk.delete_referential_action_desc AS deleteAction,
  fk.update_referential_action_desc AS updateAction,
  CAST(fk.is_disabled AS bit) AS isDisabled,
  CAST(fk.is_not_trusted AS bit) AS isNotTrusted,
  JSON_QUERY((
    SELECT
      sourceColumn.name AS sourceColumnName,
      referencedColumn.name AS referencedColumnName,
      fkc.constraint_column_id AS ordinal
    FROM sys.foreign_key_columns fkc
    JOIN sys.columns sourceColumn
      ON sourceColumn.object_id = fkc.parent_object_id
      AND sourceColumn.column_id = fkc.parent_column_id
    JOIN sys.columns referencedColumn
      ON referencedColumn.object_id = fkc.referenced_object_id
      AND referencedColumn.column_id = fkc.referenced_column_id
    WHERE fkc.constraint_object_id = fk.object_id
    ORDER BY fkc.constraint_column_id
    FOR JSON PATH
  )) AS columns
FROM sys.foreign_keys fk
JOIN sys.tables sourceTable ON sourceTable.object_id = fk.parent_object_id
JOIN sys.schemas sourceSchema ON sourceSchema.schema_id = sourceTable.schema_id
JOIN sys.tables referencedTable ON referencedTable.object_id = fk.referenced_object_id
JOIN sys.schemas referencedSchema ON referencedSchema.schema_id = referencedTable.schema_id
WHERE sourceTable.is_ms_shipped = 0
  AND referencedTable.is_ms_shipped = 0
  AND NOT (sourceSchema.name = N'dbo' AND sourceTable.name = N'sysdiagrams')
  AND NOT (referencedSchema.name = N'dbo' AND referencedTable.name = N'sysdiagrams')
ORDER BY sourceSchema.name, sourceTable.name, fk.name
FOR JSON PATH;

/* Result set 7: indexes */
SELECT
  s.name AS schemaName,
  t.name AS tableName,
  CONCAT(s.name, N'.', t.name) AS tableKey,
  i.name AS indexName,
  i.index_id AS sourceIndexId,
  i.type_desc AS indexTypeDescription,
  CAST(i.is_unique AS bit) AS isUnique,
  CAST(i.is_primary_key AS bit) AS isPrimaryKey,
  CAST(i.is_unique_constraint AS bit) AS isUniqueConstraint,
  CAST(i.has_filter AS bit) AS hasFilter,
  i.filter_definition AS filterDefinition,
  JSON_QUERY((
    SELECT
      c.name AS columnName,
      ic.key_ordinal AS keyOrdinal,
      ic.index_column_id AS indexColumnOrdinal,
      CAST(ic.is_included_column AS bit) AS isIncludedColumn,
      CAST(ic.is_descending_key AS bit) AS isDescending
    FROM sys.index_columns ic
    JOIN sys.columns c
      ON c.object_id = ic.object_id
      AND c.column_id = ic.column_id
    WHERE ic.object_id = i.object_id
      AND ic.index_id = i.index_id
    ORDER BY ic.key_ordinal, ic.index_column_id
    FOR JSON PATH
  )) AS columns
FROM sys.indexes i
JOIN sys.tables t ON t.object_id = i.object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
  AND NOT (s.name = N'dbo' AND t.name = N'sysdiagrams')
  AND i.index_id > 0
  AND i.is_hypothetical = 0
ORDER BY s.name, t.name, i.index_id
FOR JSON PATH;

/* Result set 8: views */
SELECT
  s.name AS schemaName,
  v.name AS viewName,
  CONCAT(s.name, N'.', v.name) AS viewKey,
  v.object_id AS sourceObjectId,
  v.create_date AS createdAt,
  v.modify_date AS modifiedAt,
  CAST(v.is_ms_shipped AS bit) AS isMsShipped,
  CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), OBJECT_DEFINITION(v.object_id))), 2) AS definitionSha256,
  CASE WHEN @IncludeModuleDefinitions = 1 THEN OBJECT_DEFINITION(v.object_id) ELSE NULL END AS definition,
  ep.value AS description
FROM sys.views v
JOIN sys.schemas s ON s.schema_id = v.schema_id
LEFT JOIN sys.extended_properties ep
  ON ep.major_id = v.object_id
  AND ep.minor_id = 0
  AND ep.name = N'MS_Description'
WHERE v.is_ms_shipped = 0
ORDER BY s.name, v.name
FOR JSON PATH;

/* Result set 9: stored procedures and functions */
SELECT
  s.name AS schemaName,
  o.name AS routineName,
  CONCAT(s.name, N'.', o.name) AS routineKey,
  o.object_id AS sourceObjectId,
  o.type AS routineType,
  o.type_desc AS routineTypeDescription,
  o.create_date AS createdAt,
  o.modify_date AS modifiedAt,
  CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), OBJECT_DEFINITION(o.object_id))), 2) AS definitionSha256,
  CASE WHEN @IncludeModuleDefinitions = 1 THEN OBJECT_DEFINITION(o.object_id) ELSE NULL END AS definition,
  ep.value AS description,
  JSON_QUERY((
    SELECT
      p.name AS parameterName,
      p.parameter_id AS ordinal,
      ty.name AS dataType,
      CASE
        WHEN ty.name IN (N'nchar', N'nvarchar') AND p.max_length > 0 THEN p.max_length / 2
        WHEN ty.name IN (N'char', N'varchar', N'binary', N'varbinary') THEN p.max_length
        WHEN p.max_length = -1 THEN -1
        ELSE NULL
      END AS maxLength,
      p.precision,
      p.scale,
      CAST(p.is_output AS bit) AS isOutput
    FROM sys.parameters p
    JOIN sys.types ty ON ty.user_type_id = p.user_type_id
    WHERE p.object_id = o.object_id
    ORDER BY p.parameter_id
    FOR JSON PATH
  )) AS parameters
FROM sys.objects o
JOIN sys.schemas s ON s.schema_id = o.schema_id
LEFT JOIN sys.extended_properties ep
  ON ep.major_id = o.object_id
  AND ep.minor_id = 0
  AND ep.name = N'MS_Description'
WHERE o.is_ms_shipped = 0
  AND o.type IN (N'P', N'FN', N'IF', N'TF', N'FS', N'FT')
ORDER BY s.name, o.type, o.name
FOR JSON PATH;

/* Result set 10: triggers */
SELECT
  triggerSchema.name AS schemaName,
  tr.name AS triggerName,
  parentSchema.name AS parentSchemaName,
  parentObject.name AS parentObjectName,
  CONCAT(parentSchema.name, N'.', parentObject.name) AS parentObjectKey,
  parentObject.type_desc AS parentObjectTypeDescription,
  tr.object_id AS sourceObjectId,
  tr.create_date AS createdAt,
  tr.modify_date AS modifiedAt,
  CAST(tr.is_disabled AS bit) AS isDisabled,
  CAST(tr.is_instead_of_trigger AS bit) AS isInsteadOfTrigger,
  CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), OBJECT_DEFINITION(tr.object_id))), 2) AS definitionSha256,
  CASE WHEN @IncludeModuleDefinitions = 1 THEN OBJECT_DEFINITION(tr.object_id) ELSE NULL END AS definition
FROM sys.triggers tr
JOIN sys.objects triggerObject ON triggerObject.object_id = tr.object_id
JOIN sys.objects parentObject ON parentObject.object_id = tr.parent_id
JOIN sys.schemas parentSchema ON parentSchema.schema_id = parentObject.schema_id
JOIN sys.schemas triggerSchema ON triggerSchema.schema_id = triggerObject.schema_id
WHERE tr.is_ms_shipped = 0
  AND NOT (parentSchema.name = N'dbo' AND parentObject.name = N'sysdiagrams')
ORDER BY parentSchema.name, parentObject.name, tr.name
FOR JSON PATH;

/* Result set 11: SQL expression dependencies */
SELECT
  referencingSchema.name AS referencingSchemaName,
  referencingObject.name AS referencingObjectName,
  CONCAT(referencingSchema.name, N'.', referencingObject.name) AS referencingObjectKey,
  referencingObject.type_desc AS referencingObjectTypeDescription,
  dep.referenced_schema_name AS referencedSchemaName,
  dep.referenced_entity_name AS referencedEntityName,
  CASE
    WHEN dep.referenced_schema_name IS NOT NULL AND dep.referenced_entity_name IS NOT NULL
      THEN CONCAT(dep.referenced_schema_name, N'.', dep.referenced_entity_name)
    ELSE dep.referenced_entity_name
  END AS referencedObjectKey,
  referencedObject.type_desc AS referencedObjectTypeDescription,
  CAST(dep.is_schema_bound_reference AS bit) AS isSchemaBoundReference,
  CAST(dep.is_caller_dependent AS bit) AS isCallerDependent,
  CAST(dep.is_ambiguous AS bit) AS isAmbiguous
FROM sys.sql_expression_dependencies dep
JOIN sys.objects referencingObject ON referencingObject.object_id = dep.referencing_id
JOIN sys.schemas referencingSchema ON referencingSchema.schema_id = referencingObject.schema_id
LEFT JOIN sys.objects referencedObject ON referencedObject.object_id = dep.referenced_id
WHERE referencingObject.is_ms_shipped = 0
  AND NOT (referencingSchema.name = N'dbo' AND referencingObject.name = N'sysdiagrams')
  AND NOT (dep.referenced_schema_name = N'dbo' AND dep.referenced_entity_name = N'sysdiagrams')
ORDER BY referencingSchema.name, referencingObject.name, dep.referenced_schema_name, dep.referenced_entity_name
FOR JSON PATH;
