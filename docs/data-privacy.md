# Data Privacy

FicheBait Schema Reference is intended to collect and publish schema metadata only.

## Collected Metadata

Accepted schema exports may include:

- Product key, product name, product version, database role, and export timestamp
- Schema names
- Table names and column definitions
- Primary keys, unique keys, foreign keys, and indexes
- View, routine, trigger, and dependency metadata
- Optional definition hashes

## Not Collected

Do not submit:

- Table row data
- Customer names
- User record values
- Document, folder, form submission, or workflow instance values
- SQL Server database names
- SQL Server server names
- SQL Server version, compatibility level, file paths, or instance configuration
- Credentials, connection strings, screenshots of records, or private notes

## Why Database Names Are Excluded

Laserfiche customer environments can name databases differently. Product and version identity must come from explicit export fields, not the SQL Server database name.

## Public Site

The public GitHub Pages site is static and read-only. Public builds should not include manual note editing or import UI.

## Review Boundary

Schema export submissions should be reviewed before publishing. If a file contains row data or environment-specific identifiers, it should be rejected and regenerated.

Use `docs/privacy-review-checklist.md` for maintainer review before importing or publishing a submission.

## Issue Attachments

Community submissions are handled through GitHub Issues only. If an issue
attachment contains sensitive data, remove or hide the public issue content as
quickly as possible and ask the submitter to regenerate a metadata-only export.

Do not copy submitted files into `public/data` until:

- the privacy checklist passes
- required files are present
- product and version identity comes from the manifest
- duplicate version warnings have been reviewed
- validation commands pass locally
