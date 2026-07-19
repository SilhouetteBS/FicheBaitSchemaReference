---
name: Schema export submission
about: Request private intake for a sanitized Laserfiche product schema export
title: "Schema export: "
labels: schema-export, needs-review
assignees: ""
---

## Product Version

- Product:
- Product version:
- Database role:
- Export date:

## Files Included

Do not attach raw exports to this public issue. This checklist describes the
sanitized package available for private maintainer intake after initial triage.

- [ ] `manifest.json`
- [ ] `schemas.json`
- [ ] `tables.json`
- [ ] `columns.json`
- [ ] `primaryAndUniqueKeys.json`
- [ ] `foreignKeys.json`
- [ ] `indexes.json`
- [ ] `views.json`
- [ ] `routines.json`
- [ ] `triggers.json`
- [ ] `dependencies.json`

## Privacy Confirmation

- [ ] I have not attached raw or sanitized export files to this public issue.
- [ ] I used the current repository export script, which omits source IDs, row counts, owner names, dates, extended descriptions, and SQL module bodies.
- [ ] Export contains schema metadata only.
- [ ] Export does not contain table row data.
- [ ] Export does not contain customer names, document values, form submission values, or workflow instance values.
- [ ] Export does not rely on the SQL Server database name as the product/version identifier.
- [ ] Export does not include credentials, connection strings, server names, or screenshots.
- [ ] Export does not include SQL Server version, compatibility level, file paths, or instance configuration.
- [ ] Export does not include `dbo.sysdiagrams`.
- [ ] I reviewed `docs/data-privacy.md` and `docs/privacy-review-checklist.md`.

After this issue is triaged, a maintainer will provide private transfer
instructions. Only the sanitized output should be transferred. Never publish a
raw catalog export, even if it appears to contain metadata only.

## Duplicate Version Review

- [ ] This product/version is new.
- [ ] This product/version already exists and should be reviewed as a replacement.

If this is a replacement, explain why:

## Notes

Describe missing optional files or empty result sets here. Do not paste JSON,
SQL definitions, object inventories, or links to downloadable exports.
