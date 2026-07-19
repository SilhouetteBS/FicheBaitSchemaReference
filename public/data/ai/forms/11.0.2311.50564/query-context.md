# Forms 11.0.2311.50564 AI query context

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

- Product: Forms (forms)
- Version: 11.0.2311.50564
- Database role: forms
- Exported at UTC: 2026-06-16T23:21:45
- Tables: 180
- Columns: 1312
- Foreign keys: 271
- Views: 3
- Routines: 30
- Triggers: 5
- Dependencies: 146

## Retrieval guidance

- Start with `tables.jsonl` for table purpose, caveats, keys, and compact column summaries.
- Use `columns.jsonl` when validating SELECT lists, filters, GROUP BY clauses, and aliases.
- Use `relationships.jsonl` for confirmed SQL Server foreign keys.
- Use `dependencies.jsonl` and `objects.jsonl` to review views, routines, triggers, and expression dependencies.
- If a relationship is not in `relationships.jsonl`, describe it as inferred unless separate evidence is provided.

## Common reporting paths

### Process lifecycle

Start with business processes, then follow instances and submission records.

Tables: dbo.cf_business_processes, dbo.cf_bp_main_instances, dbo.cf_submissions

### Form design to submitted values

Use form definitions and fields to orient submitted data tables before aggregating.

Tables: dbo.cf_forms, dbo.cf_fields, dbo.cf_bp_data

### Users, groups, and roles

Map user records through group membership and role assignment tables.

Tables: dbo.cf_users, dbo.cf_usergroups_users_mapping, dbo.cf_usergroups, dbo.cf_roles

### Tasks, timers, and history

Use worker instance tables and history tables for queue and task-state reporting.

Tables: dbo.cf_bp_worker_instances, dbo.cf_bp_worker_instance_history, dbo.cf_bp_task_reminders

## Common questions

- Which processes exist and how are they named?
  Guidance: Start with process definition tables, then inspect process instance tables before counting activity.
  Tables: dbo.cf_business_processes, dbo.cf_bp_main_instances
- How many submissions exist by process or date?
  Guidance: Use submission and process tables, then validate the join path from exported foreign keys or the diagram.
  Tables: dbo.cf_business_processes, dbo.cf_submissions
- Where are submitted field values stored?
  Guidance: Use form and field definitions to identify the value tables, then verify value column meaning before reporting.
  Tables: dbo.cf_forms, dbo.cf_fields, dbo.cf_bp_data
- Who can access or administer Forms items?
  Guidance: Start with users and group/role mapping tables, then confirm the meaning of flags and role identifiers.
  Tables: dbo.cf_users, dbo.cf_usergroups_users_mapping, dbo.cf_roles

## Generated examples

### List processes

Generated from columns exported for this version. Narrow the SELECT list further before operational use.

```sql
SELECT TOP (100)
  [name],
  [bp_id],
  [date_created],
  [description],
  [date_updated]
FROM [dbo].[cf_business_processes]
ORDER BY 1;
```

### Show task records for status review

Generated using status-like column status. Confirm the meaning of each status value before reporting.

```sql
SELECT TOP (100)
  [status],
  [updated_by_snapshotid],
  [instance_id],
  [instance_type],
  [ref_instance_id]
FROM [dbo].[cf_bp_worker_instances]
WHERE [status] IS NOT NULL
ORDER BY [update_date] DESC;
```

### List users

User table exists; inspect exported foreign keys before adding group or role joins.

```sql
SELECT TOP (100)
  u.[username],
  u.[displayname],
  u.[email],
  u.[sid],
  u.[user_type]
FROM [dbo].[cf_users] AS u
ORDER BY 1;
```
