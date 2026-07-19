# Workflow 12.0.2508.3111 AI query context

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

- Product: Workflow (workflow)
- Version: 12.0.2508.3111
- Database role: workflow
- Exported at UTC: 2026-06-17T03:29:57
- Tables: 71
- Columns: 415
- Foreign keys: 37
- Views: 9
- Routines: 86
- Triggers: 0
- Dependencies: 200

## Retrieval guidance

- Start with `tables.jsonl` for table purpose, caveats, keys, and compact column summaries.
- Use `columns.jsonl` when validating SELECT lists, filters, GROUP BY clauses, and aliases.
- Use `relationships.jsonl` for confirmed SQL Server foreign keys.
- Use `dependencies.jsonl` and `objects.jsonl` to review views, routines, triggers, and expression dependencies.
- If a relationship is not in `relationships.jsonl`, describe it as inferred unless separate evidence is provided.

## Common reporting paths

### Task queue diagnostics

Use queue and queue data tables to review retry state, queued work, and task payload size.

Tables: dbo.workflow_task_queue, dbo.workflow_task_queue_data

### Search activity tracing

Connect search instance records to search entry records for current and logged activity.

Tables: dbo.search_instance, dbo.search_entry, dbo.search_instance_log, dbo.search_entry_log

### Instance completion status

Use completion records for workflow instance completion and retry diagnostics.

Tables: dbo.instance_completion

## Common questions

- Which workflows, schedules, and runtime records exist?
  Guidance: Start with workflow definition tables, then follow runtime/history relationships for execution reporting.
  Tables: dbo.Workflow, dbo.Schedule, dbo.Instance
- How can I inspect workflow activity or error history?
  Guidance: Use activity/history tables and confirm status values before aggregating by state or error.
  Tables: dbo.Activity, dbo.InstanceHistory, dbo.Error

## Generated examples

No generated examples are available for this product/version.
