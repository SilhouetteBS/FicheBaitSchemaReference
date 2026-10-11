# Workflow Queue and Search Diagnostics Evidence

Product/version: Workflow `12.0.2605.385`

## Goal

Provide read-only queue-size, search-activity, and instance-completion diagnostics with row/date filters.

## Confirmed Schema Evidence

- `dbo.workflow_task_queue_data.task_id -> dbo.workflow_task_queue.task_id`.
- `dbo.search_entry.search_id` aligns with `dbo.search_instance.search_id`.
- `dbo.search_entry_log.search_id` aligns with `dbo.search_instance_log.search_id`.
- `dbo.search_activity.search_id` and `dbo.search_activity_log.search_id` expose activity timing for current and logged search activity rows.
- `dbo.search_error.search_id` and `dbo.search_error_log.search_id` expose current and logged Workflow search/activity error messages.
- `dbo.instance_completion` stores Workflow instance completion and retry timestamps.

## Queue Sources Processed

- [Workflow activity search SQL error ambiguous column name](https://answers.laserfiche.com/questions/62128/Workflow-activity-search-SQL-error-ambiguous-column-name)
- [A transport-level error has occurred when receiving results from the server](https://answers.laserfiche.com/questions/105587/A-transportlevel-error-has-occurred-when-receiving-results-from-the-server-provider-TCP-Provider-error-0--The-semaphore-timeout-period-has-expired)
- [workflow_task_queue_data table size very large](https://answers.laserfiche.com/questions/128584/workflowTaskQueuedata-table-size-very-large--Using-SQL-Express-database)
- [SQL Query to identify workflows running more than an Hour](https://answers.laserfiche.com/questions/136072/SQL-Query-to-identify-workflows-running-more-than-an-Hour)
- [SQL Query to get the number of workflows by repository name or ID](https://answers.laserfiche.com/questions/153150/SQL-Query-to-get-the-number-of-workflows-by-repository-name-or-ID)
- [Feature Request: List all rules invoking a given workflow rule](https://answers.laserfiche.com/questions/181460/Feature-Request-List-all-rules-invoking-a-given-separate-workflow-rule)
- [Daily Workflow Report of Instances Running Longer than X Amount of Time](https://answers.laserfiche.com/questions/91303/Daily-Workflow-Report-of-Instances-Running-Longer-than-X-Amount-of-Time)
- [Workflow Warning/Error locations](https://answers.laserfiche.com/questions/148987/Workflow-WarningError-locations)
- [Workflow database question](https://answers.laserfiche.com/questions/97863/Workflow-database-question)
- [Awesome Workflow SQL Database Size despite Single Day Log Files Lifetime](https://answers.laserfiche.com/questions/81029/Awesome-Workflow-SQL-Database-Size-despite-Single-Day-Log-Files-Lifetime)
- [Feature Request: Display Scheduled WF Rules on a Calendar](https://answers.laserfiche.com/questions/174675/Feature-Request-Display-Scheduled-WF-Rules-on-a-Calendar)

## Cautions

- Read-only database/Designer review for Workflow `12.0.2605.385` correlated current activity `close_status = 0` with Running and historical `close_status = 1` with Completed. This is sample evidence, not a complete enum or live execution test of this script.
- Current Running samples had populated, sometimes earlier-than-start `end_time` values. Their `elapsed_minutes` is deliberately NULL. Historical elapsed minutes are calculated only for sampled Completed code 1 with nonnegative timestamps; unknown states remain NULL.
- The retained `usp_WorkflowLongRunningSearchActivities` name reports long elapsed completed historical activities, not a reliable running-instance alarm. No current-clock subtraction is used because timestamp storage conventions are unverified. `work_time` is not a verified elapsed duration, and NULL occurs on completed activities too.
- Search status and reporting status are separate code families. Reporting rows may lack retained search detail; optional user/rule labels need LEFT JOIN. Missing rows do not prove a retention policy or corruption.
- Queue and completion tables were empty in the reviewed demo. Their schema is available, but retry/state behavior was not live verified.

- Queue payload columns can contain workflow runtime details; the public view exposes payload sizes, not payload text.
- Add date filters before running diagnostics against large Workflow databases.
- Create reporting objects in a separate reporting database.
