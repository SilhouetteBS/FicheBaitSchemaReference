/*
Forms field-value to instance lookup reporting pattern.

Target: reporting database, not the Forms product database.
Product schema evidence: Forms 12.0.2607.40144 export; read-only sample review.

Usage:
  1. Open in SQL Server Management Studio with SQLCMD Mode enabled.
  2. Set FormsDatabase to the Forms product database name.
  3. Execute from the reporting database where rpt objects should live.

Notes:
  - The view reads Forms product tables only.
  - Do not add indexes, views, stored procedures, or other objects to the Forms product database.
  - Submitted values can include personal or sensitive data. Restrict permissions on reporting objects.
*/

:setvar FormsDatabase "Forms"

IF SCHEMA_ID(N'rpt') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA rpt AUTHORIZATION dbo;');
END;
GO

CREATE OR ALTER VIEW rpt.vw_FormsFieldValues
AS
SELECT
    d.bp_data_id,
    d.submission_id,
    s.bp_instance_id,
    m.ref_bp_instance_id,
    m.process_id,
    m.bp_name AS process_name,
    m.title AS instance_title,
    m.status AS instance_status,
    CASE m.status
        WHEN 1 THEN N'Running'
        WHEN 2 THEN N'Complete'
        WHEN 3 THEN N'Canceled'
        WHEN 4 THEN N'TerminatedByError'
        WHEN 5 THEN N'TerminatedByEndEvent'
        WHEN 99 THEN N'Archived'
        ELSE N'Unknown'
    END AS instance_status_name,
    m.start_date AS instance_start_date,
    m.end_date AS instance_end_date,
    s.date_created AS submission_created_date,
    s.status AS submission_status,
    f.form_id,
    f.field_id,
    d.attribute_id,
    f.label AS field_label,
    f.custom_field_name,
    f.type AS field_type,
    d.repeat_id,
    d.member_path,
    d.value AS field_value,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(FormsDatabase)].dbo.cf_bp_data AS d
LEFT JOIN [$(FormsDatabase)].dbo.cf_submissions AS s
    ON d.submission_id = s.submission_id
LEFT JOIN [$(FormsDatabase)].dbo.cf_bp_main_instances AS m
    ON s.bp_instance_id = m.bp_instance_id
-- Resolve field labels only when this submission supplies explicit form context.
-- A variable can bind to fields on several forms; attribute_id alone multiplies rows.
LEFT JOIN [$(FormsDatabase)].dbo.cf_form_submissions AS fs
    ON d.submission_id = fs.submission_id
LEFT JOIN [$(FormsDatabase)].dbo.cf_fields AS f
    ON d.attribute_id = f.attribute_id
    AND fs.form_id = f.form_id;
GO

CREATE OR ALTER PROCEDURE rpt.usp_FindFormsInstancesByFieldValue
    @FieldNameOrLabel nvarchar(500) = NULL,
    @ValueContains nvarchar(4000) = NULL,
    @FromDate datetime = NULL,
    @ToDate datetime = NULL,
    @Top int = 200
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 5000 THEN @Top ELSE 200 END;

    SELECT TOP (@EffectiveTop)
        bp_instance_id,
        ref_bp_instance_id,
        process_id,
        process_name,
        instance_title,
        instance_status,
        instance_status_name,
        instance_start_date,
        instance_end_date,
        submission_id,
        submission_created_date,
        form_id,
        field_id,
        attribute_id,
        field_label,
        custom_field_name,
        field_type,
        repeat_id,
        member_path,
        field_value
    FROM rpt.vw_FormsFieldValues
    WHERE
        (@FieldNameOrLabel IS NULL
            OR field_label LIKE N'%' + @FieldNameOrLabel + N'%'
            OR custom_field_name LIKE N'%' + @FieldNameOrLabel + N'%')
        AND (@ValueContains IS NULL OR field_value LIKE N'%' + @ValueContains + N'%')
        AND (@FromDate IS NULL OR submission_created_date >= @FromDate)
        AND (@ToDate IS NULL OR submission_created_date < DATEADD(day, 1, @ToDate))
    ORDER BY submission_created_date DESC, bp_instance_id DESC, field_id;
END;
GO

/*
Validation examples:

EXEC rpt.usp_FindFormsInstancesByFieldValue
    @FieldNameOrLabel = N'Invoice',
    @ValueContains = N'12345',
    @FromDate = '2026-01-01',
    @Top = 100;

SELECT field_label, custom_field_name, field_type, COUNT_BIG(*) AS value_count
FROM rpt.vw_FormsFieldValues
GROUP BY field_label, custom_field_name, field_type
ORDER BY value_count DESC;
*/
