# LFDS 11.0.2403.2474 AI query context

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

- Product: LFDS (lfds)
- Version: 11.0.2403.2474
- Database role: lfds
- Exported at UTC: 2026-06-17T15:42:48
- Tables: 111
- Columns: 585
- Foreign keys: 85
- Views: 0
- Routines: 24
- Triggers: 0
- Dependencies: 37

## Retrieval guidance

- Start with `tables.jsonl` for table purpose, caveats, keys, and compact column summaries.
- Use `columns.jsonl` when validating SELECT lists, filters, GROUP BY clauses, and aliases.
- Use `relationships.jsonl` for confirmed SQL Server foreign keys.
- Use `dependencies.jsonl` and `objects.jsonl` to review views, routines, triggers, and expression dependencies.
- If a relationship is not in `relationships.jsonl`, describe it as inferred unless separate evidence is provided.

## Common reporting paths

### Directory identities and providers

Start with directory objects, then add provider context and login details.

Tables: dbo.directory_objects, dbo.identity_providers, dbo.user_logins

### User licenses

Use directory object SIDs to connect identity records to license assignments.

Tables: dbo.directory_objects, dbo.user_licenses, dbo.container_limits

### SAML to Laserfiche SID mapping

Use SID mapping tables when reconciling federated users to Laserfiche identities.

Tables: dbo.saml_lf_sid_mappings, dbo.directory_objects, dbo.identity_providers

## Common questions

- Which identities, providers, and groups are configured?
  Guidance: Start with directory object and provider tables, then inspect foreign keys before joining identity records.
  Tables: dbo.directory_objects, dbo.identity_providers, dbo.groups
- Which licenses or registered applications are represented?
  Guidance: Start with license/application tables and validate product-specific meaning before operational reporting.
  Tables: dbo.licenses, dbo.applications

## Generated examples

No generated examples are available for this product/version.
