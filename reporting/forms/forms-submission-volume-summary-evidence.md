# Forms Submission Volume Summary Evidence

Column-compatible imported builds: Forms `12.0.2503.10378`, `12.0.2509.20409`,
`12.0.2603.30215`, and `12.0.2607.40144`. Static schema checks only; **Not live tested**.
Forms `11.0.2311.50564` is not compatible as written because its exported main-instance
and submission tables lack `is_test_mode`. No compatibility claim is made for the
unimported Forms `12.0.2610.50154` build.

## Goal

Provide a read-only reporting pattern for submission and instance counts by process and status.

## Confirmed Schema Evidence

- `dbo.cf_bp_main_instances` stores process instance identifiers, dates, titles, and status.
- `dbo.cf_business_processes` stores process names and friendly names.
- `dbo.cf_bp_main_instances.process_id -> dbo.cf_bp_processes.process_id -> dbo.cf_business_processes.bp_id`.
- `dbo.cf_submissions.bp_instance_id` connects submitted rows to process instances.
- `dbo.cf_submissions.date_created`, `status`, `priority`, and `is_test_mode` support filtered reporting.
- Both main-instance and submission test-mode flags are checked so an instance
  without submissions is not counted as non-test solely because its joined row is null.

## Date Window And Count Grain

- Each joined row uses one event date: submission creation when a submission exists,
  or instance start only when no submission exists. A submission with a missing
  date stays unknown; it does not silently inherit a different event's timestamp.
- `FromDate` is inclusive and `ToDate` exclusive. Reversed/empty bounded ranges are
  rejected. The prior independent OR checks could admit a row started before the
  window but submitted after it; that cross-timestamp admission has been removed.
- Grouping includes business-process `bp_id`, preventing different processes with
  identical display names from being combined. Versions of the same business
  process remain grouped together; a missing process join remains an unknown bucket.
- `instance_count` is distinct instances represented by the included rows, not a
  count of every instance active during the interval. Submission counts are not
  task-completion counts. Read stored timestamps in their verified environment
  context; no UTC conversion or time-zone contract is assumed.

## Queue Sources Processed

- [Top 10 Forms Submissions](https://answers.laserfiche.com/questions/237177/Top-10-Forms-Submissions--An-Experience-Using-AI-To-Write-A-SQL-Query)
- [Report to use for Active Forms](https://answers.laserfiche.com/questions/216937/Report-to-use-for-Active-Forms)

## Cautions

- Validate the process join path in your exported schema. Some Forms versions expose process-version identifiers differently.
- Use date filters on large Forms databases.
- Deploy these objects to a separate reporting database.
- This is not a process-retention/deletion recommendation. The existing reviewed
  [process-usage discussion](https://answers.laserfiche.com/questions/225824/Need-a-way-to-export-list-of-Forms-processes-that-havent-run-recently-for-cleanup-purposes)
  considers completed-instance start dates; that is not the same measure as all
  recent activity. No source SQL was copied into this correction.
