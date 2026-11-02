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

Run the script once against each product database/build being contributed. Replace the example version with the exact installed product build, confirmed separately from SQL Server's version. The actual SQL Server database name can differ in every environment and must not be used as a product or version identifier.

`@DatabaseRole` should describe the Laserfiche product database being exported, such as `forms`, `lfds`, `repository`, or `workflow`. It is not the SQL Server database name.

## Module Fingerprints And View Columns

The canonical script exports SHA-256 definition fingerprints, not SQL module definition text. There is no `@IncludeModuleDefinitions` setting. A changed fingerprint can reflect logic, comments, or formatting; it does not establish functional impact. Compare keeps definition-only changes separate from structural changes. Missing fingerprints are a metadata-availability gap, not proof that SQL text changed.

The `views` result includes nested output columns (names, ordinals, types, lengths, precision, scale, collation, and nullability). New full exports do not need a separate `view-columns-export.sql` run. That recovery script is only for an existing snapshot whose view-column metadata is missing; never combine it with another build's export.

## Missing Latest-Build Exports: Checked 2026-11-02

The [official Laserfiche 12 release list](https://doc.laserfiche.com/laserfiche.documentation/12/userguide/en-us/content/intro-release-information.htm) lists two October 28 releases newer than this catalog. A new application build does not prove its schema changed; fresh exports are required to determine that.

| Product | Latest imported build | Official listed build | Required contribution |
| --- | --- | --- | --- |
| LFDS | 12.0.2607.421 | 12.0.2610.126 | Full metadata export from Directory Server 12.0.2610.126. Set product key/role to `lfds`, product name to `LFDS`. |
| Repository Server | 12.0.4.433 | 12.0.5.447 | Full metadata export from a repository database served by Server 12.0.5.447. Set product key/role to `repository`, product name to `Repository`. Use the Server build, not the Desktop or Web Client build. |
| Forms | 12.0.2607.40144 | 12.0.2607.40144 | No newer listed target build identified in this check. |
| Workflow | 12.0.2605.385 | 12.0.2605.385 | No newer listed target build identified in this check. |

For each requested build, use the current script and save all eleven result sets listed below, including `views` with output columns. Preserve empty results as `[]`, or explicitly confirm that no views/triggers exist for that export. Keep the source files outside Git for private intake. Do not send row data, database/server names, connection details, or credentials. Do not relabel an older snapshot as a new build even if the schemas might be identical.

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

Product/version manifests are maintained in canonical `data/`. Run `npm run prepare:data` after importing to rebuild the ignored runtime mirrors and AI package. Development and production builds run this preparation automatically. Both `--input-dir="folder"` and `--input-dir "folder"` are accepted. Product-prefixed filenames are matched case-insensitively; ambiguous folders fail instead of guessing which export to use.

## Safety

The export script reads SQL Server catalog metadata only. It does not query Laserfiche business table rows and does not modify the database.

This documentation supports read-only reporting, troubleshooting, and education. Direct modification of Laserfiche product databases is unsupported; consult your applicable license and support agreements. Validate changes in a test environment.
