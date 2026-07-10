# Schema Export Guide

Use `docs/sql-server-schema-export.sql` for Forms, LFDS, Repository, and Workflow exports. It is the single canonical executable metadata export script. `docs/forms-schema-export.sql` remains only as a compatibility pointer for older links.

## Before Running

Open the script and set these values:

```sql
DECLARE @ProductKey nvarchar(50) = N'forms';
DECLARE @ProductName nvarchar(100) = N'Forms';
DECLARE @ProductVersion nvarchar(50) = N'11.x';
DECLARE @DatabaseRole nvarchar(50) = N'forms';
```

Run the script once against the Forms 11 database and once against the Forms 12 database. The actual SQL Server database name can differ in every environment and should not be used as a product or version identifier.

`@DatabaseRole` should describe the Laserfiche product database being exported, such as `forms`, `lfds`, `repository`, or `workflow`. It is not the SQL Server database name.

## Optional Module Definitions

The script defaults to:

```sql
DECLARE @IncludeModuleDefinitions bit = 0;
```

Leave this off unless you intentionally want view, procedure, function, and trigger definitions in the export. Definition text and hashes are useful for internal review, but the app does not count definition-only changes as schema changes.

## Result Sets

The script returns JSON result sets in this order:

1. `manifest`
2. `schemas`
3. `tables`
4. `columns`
5. `primaryAndUniqueKeys`
6. `foreignKeys`
7. `indexes`
8. `views`
9. `routines`
10. `triggers`
11. `dependencies`

Save each result set as JSON. A later importer can combine them into the normalized `data/forms/<version>/schema.json` snapshot.

Foreign key result sets describe exported SQL constraints between table columns. Dependency result sets describe SQL expression references from views, routines, and triggers to other objects. SQL Server can report dependency rows that reference aliases, pseudo tables, caller-dependent names, or helper objects that are not exported as standalone schema objects; those rows are warnings for diagram completeness, not proof that the database is invalid.

If SQL Server Management Studio wraps long JSON values across lines, the importer will remove those line breaks before parsing. If a result set is saved as a tab-delimited grid instead of JSON, the importer currently supports that format for the primary/unique key result set.

## Importing

Place or leave the exported files at the default download paths:

```text
%USERPROFILE%\Downloads\manifest.json
%USERPROFILE%\Downloads\schemas.json
%USERPROFILE%\Downloads\tables.json
%USERPROFILE%\Downloads\columns.json
%USERPROFILE%\Downloads\primaryAndUniqueKeys.json
%USERPROFILE%\Downloads\foreignKeys.json
%USERPROFILE%\Downloads\indexes.json
%USERPROFILE%\Downloads\views.json
%USERPROFILE%\Downloads\routines.json
%USERPROFILE%\Downloads\triggers.json
%USERPROFILE%\Downloads\dependencies.json
```

Product-prefixed filenames are also supported and are preferred when exporting multiple products into the same folder:

```text
LFDS_manifest.json
Repository_columns.json
Workflow_foreignKeys.json
Forms_dependencies.json
```

Then run:

```powershell
npm run import:forms
```

To import from a version-specific folder instead of `Downloads`, run:

```powershell
npm run import:forms -- --input-dir "C:\path\to\forms-export-folder"
```

For LFDS or another product, use the generic importer alias and explicit product overrides:

```powershell
npm run import:schema -- --product=lfds --product-name="LFDS" --database-role=lfds --input-dir "C:\path\to\lfds-export-folder"
```

The override values are product identity values for the static dictionary. They should be set from the Laserfiche product being documented, not from the SQL Server database name.

The importer writes a sanitized static snapshot to:

```text
data/<productKey>/<productVersion>/schema.json
public/data/<productKey>/<productVersion>/schema.json
```

The importer also creates separate `notes.json` placeholders when they do not already exist. The generated snapshot intentionally avoids using SQL Server database names as product or version identifiers.

## Safety

The export script reads SQL Server catalog metadata only. It does not query Laserfiche business table rows and does not modify the database.

This documentation is for read-only reporting, troubleshooting, and education. Manually writing to or modifying Laserfiche product databases, tables, etc. will violate your Laserfiche Support plan and is not supported.
