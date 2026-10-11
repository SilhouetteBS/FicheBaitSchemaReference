/*
Workflow queue and search diagnostics reporting pattern.

Target: reporting database, not the Workflow product database.
Product schema evidence: Workflow 12.0.2605.385 AI export.

Usage:
  1. Open in SQL Server Management Studio with SQLCMD Mode enabled.
  2. Set WorkflowDatabase to the Workflow product database name.
  3. Execute from the reporting database where rpt objects should live.
*/

:setvar WorkflowDatabase "Workflow"

IF SCHEMA_ID(N'rpt') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA rpt AUTHORIZATION dbo;');
END;
GO

CREATE OR ALTER VIEW rpt.vw_WorkflowTaskQueue
AS
SELECT
    q.task_id,
    q.task_type_id,
    q.status,
    q.status_time,
    q.next_try,
    q.retry_count,
    d.start_time,
    d.owner_id,
    d.instance_id,
    d.activity_name,
    d.queue_name,
    DATALENGTH(d.task_data) AS task_data_bytes,
    DATALENGTH(d.task_result) AS task_result_bytes,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(WorkflowDatabase)].dbo.workflow_task_queue AS q
LEFT JOIN [$(WorkflowDatabase)].dbo.workflow_task_queue_data AS d
    ON q.task_id = d.task_id;
GO

CREATE OR ALTER VIEW rpt.vw_WorkflowSearchActivity
AS
SELECT
    N'current' AS source_table,
    si.search_id,
    si.instance_id,
    si.parent_instance_id,
    si.version,
    si.workflow_rule,
    si.workflow_user,
    si.workflow_id,
    se.repository_id,
    se.activity_name,
    se.entry_id,
    se.entry_name,
    se.entry_path,
    se.is_starting_entry,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(WorkflowDatabase)].dbo.search_instance AS si
LEFT JOIN [$(WorkflowDatabase)].dbo.search_entry AS se
    ON si.search_id = se.search_id
UNION ALL
SELECT
    N'log' AS source_table,
    sil.search_id,
    sil.instance_id,
    sil.parent_instance_id,
    sil.version,
    sil.workflow_rule,
    sil.workflow_user,
    sil.workflow_id,
    sel.repository_id,
    sel.activity_name,
    sel.entry_id,
    sel.entry_name,
    sel.entry_path,
    sel.is_starting_entry,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(WorkflowDatabase)].dbo.search_instance_log AS sil
LEFT JOIN [$(WorkflowDatabase)].dbo.search_entry_log AS sel
    ON sil.search_id = sel.search_id;
GO

CREATE OR ALTER VIEW rpt.vw_WorkflowSearchActivityDurations
AS
SELECT
    N'current' AS source_table,
    a.search_id,
    a.activity_id,
    a.activity_name,
    a.context_id,
    a.parent_context_id,
    a.start_time,
    a.end_time,
    a.close_status,
    a.work_time,
    -- Running samples have unreliable end_time; clock/storage conventions are unverified.
    CAST(NULL AS bigint) AS elapsed_minutes,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(WorkflowDatabase)].dbo.search_activity AS a
UNION ALL
SELECT
    N'log' AS source_table,
    al.search_id,
    al.activity_id,
    al.activity_name,
    al.context_id,
    al.parent_context_id,
    al.start_time,
    al.end_time,
    al.close_status,
    al.work_time,
    -- Only sampled Completed state 1 supports an elapsed-timestamp calculation.
    CASE WHEN al.close_status = 1 AND al.end_time >= al.start_time
         THEN DATEDIFF_BIG(SECOND, al.start_time, al.end_time) / 60
         ELSE NULL END AS elapsed_minutes,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(WorkflowDatabase)].dbo.search_activity_log AS al;
GO

CREATE OR ALTER VIEW rpt.vw_WorkflowSearchErrors
AS
SELECT
    N'current' AS source_table,
    e.search_id,
    e.activity_name,
    e.message,
    DATALENGTH(e.additional_data) AS additional_data_bytes,
    e.activity_message_type,
    e.time,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(WorkflowDatabase)].dbo.search_error AS e
UNION ALL
SELECT
    N'log' AS source_table,
    el.search_id,
    el.activity_name,
    el.message,
    DATALENGTH(el.additional_data) AS additional_data_bytes,
    el.activity_message_type,
    el.time,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(WorkflowDatabase)].dbo.search_error_log AS el;
GO

CREATE OR ALTER VIEW rpt.vw_WorkflowInstanceCompletion
AS
SELECT
    instance_completion_id,
    instance_id,
    workflow_id,
    status,
    completion_status,
    completion_time,
    last_try_time,
    last_try_status,
    next_try_time,
    DATALENGTH(state) AS state_bytes,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(WorkflowDatabase)].dbo.instance_completion;
GO

CREATE OR ALTER PROCEDURE rpt.usp_WorkflowQueueDiagnostics
    @FromDate datetime = NULL,
    @QueueName nvarchar(255) = NULL,
    @OnlyWithRetries bit = 0,
    @Top int = 500
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 10000 THEN @Top ELSE 500 END;

    SELECT TOP (@EffectiveTop)
        task_id,
        task_type_id,
        status,
        status_time,
        next_try,
        retry_count,
        start_time,
        owner_id,
        instance_id,
        activity_name,
        queue_name,
        task_data_bytes,
        task_result_bytes
    FROM rpt.vw_WorkflowTaskQueue
    WHERE
        (@FromDate IS NULL OR COALESCE(status_time, start_time, next_try) >= @FromDate)
        AND (@QueueName IS NULL OR queue_name = @QueueName)
        AND (@OnlyWithRetries = 0 OR ISNULL(retry_count, 0) > 0)
    ORDER BY COALESCE(status_time, start_time, next_try) DESC, task_id DESC;
END;
GO

CREATE OR ALTER PROCEDURE rpt.usp_WorkflowSearchErrors
    @FromDate datetime = NULL,
    @ActivityNameContains nvarchar(256) = NULL,
    @MessageContains nvarchar(512) = NULL,
    @Top int = 500
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 10000 THEN @Top ELSE 500 END;

    SELECT TOP (@EffectiveTop)
        source_table,
        search_id,
        activity_name,
        message,
        additional_data_bytes,
        activity_message_type,
        time
    FROM rpt.vw_WorkflowSearchErrors
    WHERE
        (@FromDate IS NULL OR time >= @FromDate)
        AND (@ActivityNameContains IS NULL OR activity_name LIKE N'%' + @ActivityNameContains + N'%')
        AND (@MessageContains IS NULL OR message LIKE N'%' + @MessageContains + N'%')
    ORDER BY time DESC, search_id DESC;
END;
GO

CREATE OR ALTER PROCEDURE rpt.usp_WorkflowLongRunningSearchActivities
    @MinimumMinutes int = 60,
    @FromDate datetime = NULL,
    @Top int = 500
AS
BEGIN
    SET NOCOUNT ON;
    -- Despite the retained procedure name, this reports long elapsed COMPLETED
    -- historical activities, not currently running instances. Other states are unknown.
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 10000 THEN @Top ELSE 500 END;
    DECLARE @EffectiveMinimumMinutes int = CASE WHEN @MinimumMinutes BETWEEN 1 AND 10080 THEN @MinimumMinutes ELSE 60 END;

    SELECT TOP (@EffectiveTop)
        source_table,
        search_id,
        activity_id,
        activity_name,
        context_id,
        parent_context_id,
        start_time,
        end_time,
        close_status,
        work_time,
        elapsed_minutes
    FROM rpt.vw_WorkflowSearchActivityDurations
    WHERE
        elapsed_minutes >= @EffectiveMinimumMinutes
        AND (@FromDate IS NULL OR start_time >= @FromDate)
    ORDER BY elapsed_minutes DESC, start_time DESC;
END;
GO
