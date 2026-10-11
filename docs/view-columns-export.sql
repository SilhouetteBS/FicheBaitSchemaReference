/*
  Run in the verified product database with metadata visibility permissions.
  Metadata only: no application rows or view definitions are exported.
  Save the complete JSON result as views.json, replacing only that result set
  in the matching product/version export bundle, then rerun import:schema.
  Product/version identity must come from the matching bundle's manifest.
  Uses the same view SELECT as Result set 8 in sql-server-schema-export.sql.
  Run with SSMS results to file to avoid truncation. No SQLCMD mode required.
*/
SELECT
  s.name AS schemaName,
  v.name AS viewName,
  CONCAT(s.name, N'.', v.name) AS viewKey,
  CAST(v.is_ms_shipped AS bit) AS isMsShipped,
  CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), OBJECT_DEFINITION(v.object_id))), 2) AS definitionSha256,
  JSON_QUERY((
    SELECT c.name AS columnName, c.column_id AS ordinal, ty.name AS dataType,
      CASE
        WHEN ty.name IN (N'nchar', N'nvarchar') AND c.max_length > 0 THEN c.max_length / 2
        WHEN ty.name IN (N'char', N'varchar', N'binary', N'varbinary') THEN c.max_length
        WHEN c.max_length = -1 THEN -1 ELSE NULL
      END AS maxLength,
      c.precision, c.scale,
      CONCAT(ty.name, CASE
        WHEN ty.name IN (N'nchar', N'nvarchar') AND c.max_length > 0 THEN CONCAT(N'(', c.max_length / 2, N')')
        WHEN ty.name IN (N'char', N'varchar', N'binary', N'varbinary') AND c.max_length > 0 THEN CONCAT(N'(', c.max_length, N')')
        WHEN ty.name IN (N'nchar', N'nvarchar', N'char', N'varchar', N'binary', N'varbinary') AND c.max_length = -1 THEN N'(max)'
        WHEN ty.name IN (N'decimal', N'numeric') THEN CONCAT(N'(', c.precision, N',', c.scale, N')')
        WHEN ty.name IN (N'datetime2', N'datetimeoffset', N'time') THEN CONCAT(N'(', c.scale, N')') ELSE N''
      END) AS typeDefinition,
      CAST(c.is_nullable AS bit) AS isNullable, c.collation_name AS collationName
    FROM sys.columns c
    JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    WHERE c.object_id = v.object_id
    ORDER BY c.column_id
    FOR JSON PATH
  )) AS columns
FROM sys.views v
JOIN sys.schemas s ON s.schema_id = v.schema_id
WHERE v.is_ms_shipped = 0
ORDER BY s.name, v.name
FOR JSON PATH;
