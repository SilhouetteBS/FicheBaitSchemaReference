# Contribution Workflow

FicheBait Schema Reference contributions should be reviewed before they are copied into the published static data files.

## Documentation Notes

1. Use local editing mode to draft table notes.
2. Apply the table note template when starting a new table review.
3. Keep the note focused on purpose, safe read-only reporting use, join notes, version caveats, and known columns.
4. Export `notes.json` from the app.
5. Submit the exported notes through a GitHub Issue for review before publishing.

Community submissions are issue-only. Do not open pull requests. Documentation
corrections may include non-sensitive proposed wording in an issue. Never attach
or paste raw schema exports in a public issue. Maintainers provide private intake
instructions after triage and make repository changes themselves.

Proposed documentation notes may be submitted as:

- `notes.json` exported from local editing mode.
- Markdown that identifies product, version, table/object, proposed summary,
  safe reporting use, join notes, version caveats, and known columns.
- A documentation correction issue with the current wording and proposed
  replacement wording.

Review status should move through:

- `Draft`: working notes that have not been checked.
- `In review`: proposed notes ready for another administrator to review.
- `Approved`: reviewed notes that can be copied into the static data folder.
- `Stale`: notes that need another pass because product versions or schema evidence changed.

## Schema Exports

Schema exports must be generated with the current sanitized export script. Do
not submit table row data, customer names, record values, document metadata
values, database names, source IDs, row counts, schema owners, object dates,
extended descriptions, or SQL module bodies.

The public issue contains only product/version information and the completed
privacy checklist. Transfer the sanitized JSON package through the private
channel supplied by a maintainer. Never attach raw or sanitized JSON exports to
the public issue.

Submitted exports should move through this maintainer review path before they
are imported:

1. `Submitted`: issue opened with product, version, and expected file checklist; no exports attached.
2. `Privacy review`: confirm files contain schema metadata only.
3. `Validated`: import preview has no errors and warnings are understood.
4. `Imported`: static data files are generated locally.
5. `Documentation review`: notes, examples, glossary, and known limitations are reviewed.
6. `Published`: public build and deployed site verification pass.

Expected export files:

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

Some optional result sets may be empty for a product/version. Empty files are acceptable when the export script produced no rows.

## Duplicate Versions

If a submitted product/version already exists, treat it as a replacement request. Review the source, export date, product version, and file completeness before replacing existing static files.

## Export Script Compatibility

Use the current `docs/sql-server-schema-export.sql` with SQL Server 2016 or
newer. The script relies on `FOR JSON` output and SQL Server catalog views. It
reads metadata only, omits restricted submission fields and SQL module bodies,
and does not modify Laserfiche databases.
