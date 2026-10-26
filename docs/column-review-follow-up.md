# Column Review Follow-Up

## Scope

The completed schema/documentation screening covers 3,361 table columns in Forms
12.0.2607.40144, LFDS 12.0.2607.421, Repository 12.0.4.433 and Workflow
12.0.2605.385. It is not exhaustive runtime verification or a review of every
historical build. Confidence labels remain version-specific.

The follow-up reconciled 67 previously Observed Repository/Workflow claims:
63 have supporting qualified sample evidence, three describe schema structure
only and are now Inferred, and one still needs its exact client correlation
reconfirmed: Repository dbo.toc.filing_date, now Inferred rather than Observed.
Sample support does not establish
complete enums, lifecycle rules or universal invariants.

## Reporting Priorities

1. Verify status and action mappings separately for each table. Workflow search,
   reporting and activity status codes are not interchangeable. Keep missing or
   unknown states visible instead of labeling them Completed or Terminated.
2. Verify timing contracts before calculating durations. Workflow work_time is
   not established as elapsed milliseconds; a populated current activity end_time
   does not establish completion. Time zones and numeric expiry encodings need
   independent evidence.
3. Establish repository and identity scope before cross-product joins. Forms
   attachment entry IDs alone do not identify the target repository; preserve
   unmatched identities and use explicit bridges where supported.
4. Confirm historical cardinality and retention. Preserve unmatched source rows
   with appropriate outer joins; missing current definitions do not prove corruption.

Private per-column priorities and evidence worksheets remain under ignored
outputs/. They contain no exported application rows and are not shipped with
the site. Do not publish private database exports or identity/configuration values.

## Empty Tables

An empty table establishes structure, not feature behavior. Selective follow-up
reviewed Repository trusted_login and Workflow instance_completion and
workflow_task_queue. Their notes distinguish exported references from unverified
identity, state and retry semantics. Do not insert rows or enable features solely
to manufacture evidence. Prefer an existing representative test configuration,
authoritative documentation, or a safe aggregate from a consenting contributor.

## Recovered View Metadata (2026-10-26)

The owner supplied metadata-only view exports for the three exact reviewed builds.
All 19 definition hashes matched the existing snapshots. Recovery added 188 output
columns: 55 Forms, 29 Repository and 104 Workflow columns. No existing manual notes,
table metadata, dependency rows, view definitions or snapshot timestamps changed.
The latest-build view-column gap is closed; historical versions were not backfilled.

### Exact Recovery Scope

| Product build | Views with recovered output columns |
| --- | --- |
| Forms 12.0.2607.40144 | `dbo.completed_tasks_data`, `dbo.main_instance_data`, `dbo.main_instance_variable_data`, `dbo.worker_instance_data` |
| Repository Server 12.0.4.433 | `dbo.all_trustees`, `dbo.global_recycle_bin`, `dbo.locations`, `dbo.thumbnails` |
| Workflow 12.0.2605.385 | `dbo.Activities`, `dbo.Activities2`, `dbo.ai_usage_log_view`, `dbo.ai_usage_reporting_log_view`, `dbo.BPInstances`, `dbo.BPParticipants`, `dbo.BPSteps`, `dbo.Entries`, `dbo.workflow_reporting_log_view`, `dbo.Workflows`, `dbo.Workflows2` |
| LFDS 12.0.2607.421 | None: the snapshot exports no user views. No recovery export is required. |

The view objects were already present; their nested output-column lists were absent.
Recovered details include column names, ordinal positions, SQL types, length,
precision, scale, collation and nullability. The metadata is included in canonical
snapshots, public data and AI exports. Structural evidence does not establish
column purposes, enum meanings, lifecycle behavior or live-tested SQL compatibility.

### Future Recovery Steps

Run the standalone script separately against the matching three product
databases. In SSMS select Results to File (Ctrl+Shift+F) before executing and save
the complete single JSON result, without headers or truncation. Use three
separate folders named for product and exact build, each containing `views.json`,
or clearly label the three files before providing them to the maintainer.
Use an account whose metadata visibility includes all user views (the DBA can
confirm VIEW DEFINITION access). If the installed build differs, report that
build and provide a matching complete export rather than combining snapshots.

The exporter now includes nested view columns; the importer retains names,
ordinals, SQL types, precision, scale, length, collation and nullability. The AI
export preserves these columns in objects.jsonl. None are inferred from a view
name, hash, definition or dependency.

For a complete export bundle:

1. Open the verified product database in SSMS. Confirm the installed product build
   independently; database names are not product/version identifiers.
2. Run docs/view-columns-export.sql using an account with appropriate metadata
   visibility. Save the entire JSON result to a private views.json file.
3. Replace only views.json in the corresponding product/version export bundle.
   Keep its matching manifest and other exports. Never mix builds.
4. Rerun npm run import:schema -- --input-dir '<private export folder>'. Review
   changes before accepting them; existing manual notes must be preserved.
5. Validate data and notes, regenerate public data and AI exports, and inspect
   the diff before publishing. Do not treat missing permissions as absent columns.

For a standalone view-column export, use the guarded recovery importer:

```powershell
node tools/import-view-columns.mjs --product forms --version 12.0.2607.40144 --input '<private views.json>'
```

It requires the exact view set, matching definition hashes and valid column
metadata. It changes only columns in the named snapshot and refuses conflicting
existing column metadata. Repeat validation and public/AI generation after use.
No database connection is made by this importer.
