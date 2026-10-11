/*
Workflow definition and history inventory reporting pattern.

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

CREATE OR ALTER VIEW rpt.vw_WorkflowDefinitionHistory
AS
SELECT
    COALESCE(w.workflow_id, h.workflow_id) AS workflow_id,
    COALESCE(w.name, h.workflow_name) AS workflow_name,
    w.description,
    w.iname,
    w.current_ver,
    h.version AS history_version,
    h.action,
    h.user_id AS modified_by_user_id,
    h.workflow_name AS history_workflow_name,
    h.is_template,
    h.modification_date,
    c.last_update AS code_last_update,
    DATALENGTH(c.designer_code) AS designer_code_bytes,
    DATALENGTH(c.workflow_assembly) AS workflow_assembly_bytes,
    DATALENGTH(c.csharp_assembly) AS csharp_assembly_bytes,
    DATALENGTH(c.vb_assembly) AS vb_assembly_bytes,
    SYSUTCDATETIME() AS reporting_read_utc
-- Preserve history without a current definition and definitions without history.
FROM [$(WorkflowDatabase)].dbo.workflow_history AS h
FULL OUTER JOIN [$(WorkflowDatabase)].dbo.workflow AS w
    ON w.workflow_id = h.workflow_id
LEFT JOIN [$(WorkflowDatabase)].dbo.workflow_code AS c
    ON w.workflow_id = c.workflow_id
    AND w.current_ver = c.version;
GO

CREATE OR ALTER PROCEDURE rpt.usp_WorkflowDefinitionHistory
    @ModifiedSince datetime = NULL,
    @WorkflowNameContains nvarchar(255) = NULL,
    @OnlyTemplates bit = 0,
    @Top int = 500
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 10000 THEN @Top ELSE 500 END;

    SELECT TOP (@EffectiveTop)
        workflow_id,
        workflow_name,
        description,
        current_ver,
        history_version,
        action,
        modified_by_user_id,
        is_template,
        modification_date,
        code_last_update,
        designer_code_bytes,
        workflow_assembly_bytes,
        csharp_assembly_bytes,
        vb_assembly_bytes
    FROM rpt.vw_WorkflowDefinitionHistory
    WHERE
        (@ModifiedSince IS NULL OR modification_date >= @ModifiedSince OR code_last_update >= @ModifiedSince)
        AND (@WorkflowNameContains IS NULL
            OR workflow_name LIKE N'%' + @WorkflowNameContains + N'%'
            OR history_workflow_name LIKE N'%' + @WorkflowNameContains + N'%')
        AND (@OnlyTemplates = 0 OR is_template = 1)
    ORDER BY COALESCE(modification_date, code_last_update) DESC, workflow_id;
END;
GO
