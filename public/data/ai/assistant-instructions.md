# FicheBait Schema Reference AI Assistant Instructions

Use this file as the entry point before generating SQL, reviewing SQL, explaining schema objects, or designing reporting-database objects from the AI export package.

## Required startup flow

1. Read `/data/ai/catalog.json`.
2. If the user has not specified a Laserfiche product and product version, ask for them before generating or reviewing SQL.
3. Ask for the task type if it is unclear: create query, review query, create reporting view, create reporting stored procedure, explain schema, or troubleshoot SQL.
4. Load the selected product/version `query-context.md`.
5. Retrieve from that same product/version folder only: `tables.jsonl`, `columns.jsonl`, `relationships.jsonl`, `objects.jsonl`, and `dependencies.jsonl`.
6. Generate or review SQL within the read-only support boundary.

## Required user context

- Laserfiche product: Forms, LFDS, Repository, or Workflow.
- Product version from catalog.json.
- Task type: create query, review query, create reporting view, create reporting stored procedure, explain schema, or troubleshoot SQL.
- Reporting goal, expected output, or the existing SQL script to review.

## Safety boundary

This documentation is for read-only reporting, troubleshooting, and education. Manually writing to or modifying Laserfiche product databases, tables, etc. will violate your Laserfiche Support plan and is not supported.

## AI rules

- Generate read-only SQL by default.
- Never suggest inserting, updating, deleting, or directly modifying Laserfiche product database objects or records.
- If views, stored procedures, indexes, staging tables, or helper tables are requested, place them in a separate reporting database unless the user explicitly states a different supported target.
- Cite the product, version, tables, columns, and relationship evidence used.
- Call out inferred joins, ambiguous dependencies, undocumented columns, and confidence labels before presenting SQL as reliable.
- Do not rely on SQL Server database names; product and version identity come from the export manifest.

## Product/version selection rules

- Do not infer product or version from a SQL Server database name.
- Do not mix schemas across products unless the user explicitly asks for a cross-product explanation.
- Do not mix versions unless the user explicitly asks for a version comparison.
- If a requested product/version is not listed in `catalog.json`, say that it has not been imported yet.

## Available product versions

- Forms (forms) 11.0.2311.50564
- Forms (forms) 12.0.2503.10378
- Forms (forms) 12.0.2509.20409
- Forms (forms) 12.0.2603.30215
- LFDS (lfds) 11.0.2403.2474
- LFDS (lfds) 12.0.2506.370
- LFDS (lfds) 12.0.2510.261
- LFDS (lfds) 12.0.2511.289
- LFDS (lfds) 12.0.2603.369
- Repository (repository) 11.0.2.338
- Repository (repository) 12.0.1.237
- Repository (repository) 12.0.2.343
- Repository (repository) 12.0.3.423
- Workflow (workflow) 11.0.2306.898
- Workflow (workflow) 12.0.2508.3111
- Workflow (workflow) 12.0.2510.3321
- Workflow (workflow) 12.0.2511.266
- Workflow (workflow) 12.0.2605.385
