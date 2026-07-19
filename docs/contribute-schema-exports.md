# Contribute Schema Exports

FicheBait Schema Reference uses SQL Server schema metadata to document product databases for read-only reporting, troubleshooting, and education.

Schema exports must not include table row data, customer data, document metadata values, database names, server names, credentials, or screenshots of production records.

## Already Imported

Current public snapshots:

- Forms: `11.0.2311.50564`, `12.0.2503.10378`, `12.0.2509.20409`, `12.0.2603.30215`
- LFDS: `11.0.2403.2474`, `12.0.2506.370`, `12.0.2510.261`, `12.0.2511.289`, `12.0.2603.369`
- Repository: `11.0.2.338`, `12.0.1.237`, `12.0.2.343`, `12.0.3.423`
- Workflow: `11.0.2306.898`, `12.0.2508.3111`, `12.0.2510.3321`, `12.0.2511.266`, `12.0.2605.385`

Exports for other Laserfiche product versions are useful.

## Missing Versions Wanted

Exports are especially useful for product versions not listed above. Before exporting, check the current `public/data/<product>/versions.json` file or the public app product/version dropdown to avoid duplicate submissions.

## Export Steps

1. Open SQL Server Management Studio or another SQL client.
2. Connect to the target Laserfiche product database.
3. Open `docs/sql-server-schema-export.sql`.
4. Set:
   - `@ProductKey`: `forms`, `lfds`, `repository`, or `workflow`
   - `@ProductName`: display name, such as `Forms`
   - `@ProductVersion`: exact product version
   - `@DatabaseRole`: product database role, such as `forms`
5. Leave `@IncludeModuleDefinitions = 0` unless definitions are specifically needed for internal review.
6. Run the script.
7. Save each result set as UTF-8 JSON.

Expected file names:

- `manifest.json`
- `schemas.json`
- `tables.json`
- `columns.json`
- `primaryAndUniqueKeys.json`
- `foreignKeys.json`
- `indexes.json`
- `views.json`
- `routines.json`
- `triggers.json`
- `dependencies.json`

Some optional result sets may be empty. Empty `views.json`, `routines.json`, `triggers.json`, or `dependencies.json` can be valid for a product/version.

## Privacy Checks

Before submitting:

- Confirm no table row data is included.
- Confirm the SQL Server database name was not used as the product or version identifier.
- Confirm the files came from the metadata export script, not manual table queries.
- Confirm `dbo.sysdiagrams` is not included. The import process excludes it, but submissions should still avoid SSMS-created diagram objects.
- Confirm the submission passes `docs/privacy-review-checklist.md`.

## Submit

Use the GitHub issue template named `Schema export submission`. Community
submissions are handled through GitHub Issues only; do not open a pull request.

If the product/version already exists, submit it as a replacement request and explain why the existing snapshot should be replaced.
