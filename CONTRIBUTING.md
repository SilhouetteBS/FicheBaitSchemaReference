# Contributing

Thank you for helping review the FicheBait Schema Reference.

This project accepts community feedback and sanitized schema exports for
read-only reporting, troubleshooting, and education. Do not submit row data,
customer-specific values, database names, server names, screenshots of records,
credentials, connection strings, or private notes.

## Ways To Contribute

- Submit a metadata-only schema export for a missing product/version.
- Suggest a table, column, relationship, or glossary correction.
- Report UI, diagram, compare, or data-loading bugs.
- Propose safe read-only reporting examples.

Community contributions are handled through GitHub Issues only. Please do not
open pull requests; maintainers will make repository changes after issue review.

## Schema Export Submissions

Follow `docs/contribute-schema-exports.md` and use the `Schema export
submission` issue template.

Never attach raw export files to a public GitHub Issue. Open the issue with only
the product/version and checklist information. After triage, a maintainer will
provide private intake instructions. Transfer only output produced by the
current sanitized export script; do not transfer ad hoc catalog dumps or files
containing excluded metadata.

Expected files:

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

Optional result sets may be empty when the export script produced no rows.

## Privacy Requirements

Before submitting anything, read:

- `docs/data-privacy.md`
- `docs/privacy-review-checklist.md`
- `docs/known-limitations.md`

Submissions that contain row data, source IDs, row counts, schema owners,
creation/modification dates, extended descriptions, SQL module bodies,
environment-specific identifiers, database names, server names, credentials,
or production screenshots will be rejected.

## Documentation Corrections

Use the `Documentation correction` issue template. Include the product, version,
table/object/column, current wording, proposed wording, and non-sensitive source
context.

Documentation notes should focus on:

- purpose
- safe read-only reporting use
- join notes
- version caveats
- known status/type values

## Review Flow

Schema exports and notes should move through:

- `Submitted`
- `Privacy review`
- `Validated`
- `Imported`
- `Documentation review`
- `Published`

Maintainers may edit contributed wording for consistency, safety, and clarity
before publishing.

## Local Validation

For maintainers reviewing a change:

```powershell
npm ci
npm run validate
npm run validate:full
npm run verify:public-build
```

For deployed-site verification:

```powershell
$env:SITE_URL='https://silhouettebs.github.io/FicheBaitSchemaReference/'
npm run verify:deployed-site
```

## Support Boundary

This is an unofficial FicheBait community resource. It is not Laserfiche support
documentation. Direct modification of Laserfiche product databases is
unsupported. Consult your applicable license and support agreements.
