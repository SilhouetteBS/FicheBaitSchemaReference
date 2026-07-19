# Repository 12.0.2.343 AI query context

## Before answering

If the user has not specified a product and version, ask for them before generating or reviewing SQL.

Required context:

- Laserfiche product: Forms, LFDS, Repository, or Workflow.
- Product version from catalog.json.
- Task type: create query, review query, create reporting view, create reporting stored procedure, explain schema, or troubleshoot SQL.
- Reporting goal, expected output, or the existing SQL script to review.

Do not assume the SQL Server database name identifies the Laserfiche product or version. Use the selected product/version paths from `catalog.json`.

## Purpose

Use this package to help generate and review read-only reporting SQL for the selected Laserfiche product version. It contains schema metadata, relationships, object dependencies, and documentation notes. It does not contain row data.

## Support boundary

This documentation supports read-only reporting, troubleshooting, and education. Direct modification of Laserfiche product databases is unsupported; consult your applicable license and support agreements. Validate changes in a test environment.

## AI rules

- Generate read-only SQL by default.
- Never suggest inserting, updating, deleting, or directly modifying Laserfiche product database objects or records.
- If views, stored procedures, indexes, staging tables, or helper tables are requested, place them in a separate reporting database unless the user explicitly states a different supported target.
- Cite the product, version, tables, columns, and relationship evidence used.
- Call out inferred joins, ambiguous dependencies, undocumented columns, and confidence labels before presenting SQL as reliable.
- Do not rely on SQL Server database names; product and version identity come from the export manifest.

## Snapshot

- Product: Repository (repository)
- Version: 12.0.2.343
- Database role: repository
- Exported at UTC: 2026-06-18T22:39:36
- Tables: 140
- Columns: 989
- Foreign keys: 97
- Views: 4
- Routines: 110
- Triggers: 1
- Dependencies: 360

## Retrieval guidance

- Start with `tables.jsonl` for table purpose, caveats, keys, and compact column summaries.
- Use `columns.jsonl` when validating SELECT lists, filters, GROUP BY clauses, and aliases.
- Use `relationships.jsonl` for confirmed SQL Server foreign keys.
- Use `dependencies.jsonl` and `objects.jsonl` to review views, routines, triggers, and expression dependencies.
- If a relationship is not in `relationships.jsonl`, describe it as inferred unless separate evidence is provided.

## Common reporting paths

### Repository entry inventory

Start from TOC entries, then add parent, volume, and template context.

Tables: dbo.toc, dbo.vol, dbo.propset

### Field metadata and values

Use field definitions with property values to report entry metadata.

Tables: dbo.propdef, dbo.propval, dbo.toc

### Document pages and electronic documents

Use entry and page tables to review page counts, image sizes, and text inventory.

Tables: dbo.toc, dbo.doc, dbo.vol

## Common questions

- Which templates, fields, and document metadata structures exist?
  Guidance: Start with template and field tables, then use relationships to find document or entry associations.
  Tables: dbo.template, dbo.propdef, dbo.toc
- How are users, trustees, and access-related records represented?
  Guidance: Start with trustee/security tables and verify joins carefully before reporting access state.
  Tables: dbo.trustee, dbo.account_cache, dbo.acl

## Generated examples

No generated examples are available for this product/version.
