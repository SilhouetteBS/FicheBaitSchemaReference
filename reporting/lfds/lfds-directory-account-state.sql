/*
LFDS directory account state reporting pattern.

Target: reporting database, not the LFDS product database.
Product schema evidence: LFDS 12.0.2603.369 AI export.

Not live tested. The target_app column exists in imported LFDS 12.0.2510.261
through 12.0.2607.421, but not in LFDS 11.0.2403.2474 or 12.0.2506.370.
Rows can multiply by login target and group membership; TOP limits rows, not users.
LFDS login observations are not complete cross-client activity. A missing login
row or timestamp does not establish inactivity and must not trigger account disabling.

Usage:
  1. Open in SQL Server Management Studio with SQLCMD Mode enabled.
  2. Set LfdsDatabase to the LFDS product database name.
  3. Execute from the reporting database where rpt objects should live.
*/

:setvar LfdsDatabase "LFDS"

IF SCHEMA_ID(N'rpt') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA rpt AUTHORIZATION dbo;');
END;
GO

CREATE OR ALTER VIEW rpt.vw_LfdsDirectoryAccountState
AS
SELECT
    o.id AS directory_object_id,
    o.sid,
    o.name,
    o.type AS object_type,
    o.flags,
    o.container_id,
    o.namespace_id,
    o.effective_namespace_id,
    o.provider_id,
    p.name AS identity_provider_name,
    p.type AS identity_provider_type,
    o.login_fail_count,
    o.last_login_fail_time,
    l.last_login,
    l.target_app AS last_login_target_app,
    gm.group_sid,
    group_object.name AS group_name,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(LfdsDatabase)].dbo.directory_objects AS o
LEFT JOIN [$(LfdsDatabase)].dbo.identity_providers AS p
    ON o.provider_id = p.id
LEFT JOIN [$(LfdsDatabase)].dbo.user_logins AS l
    ON o.sid = l.sid
LEFT JOIN [$(LfdsDatabase)].dbo.group_membership AS gm
    ON o.sid = gm.member_sid
LEFT JOIN [$(LfdsDatabase)].dbo.directory_objects AS group_object
    ON gm.group_sid = group_object.sid;
GO

CREATE OR ALTER PROCEDURE rpt.usp_LfdsDirectoryAccountState
    @NameContains nvarchar(255) = NULL,
    @OnlyWithLoginFailures bit = 0,
    @OnlyWithoutGroup bit = 0,
    @Top int = 500
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 10000 THEN @Top ELSE 500 END;

    SELECT TOP (@EffectiveTop)
        directory_object_id,
        sid,
        name,
        object_type,
        flags,
        identity_provider_name,
        identity_provider_type,
        login_fail_count,
        last_login_fail_time,
        last_login,
        last_login_target_app,
        group_sid,
        group_name
    FROM rpt.vw_LfdsDirectoryAccountState
    WHERE
        (@NameContains IS NULL OR name LIKE N'%' + @NameContains + N'%')
        AND (@OnlyWithLoginFailures = 0 OR ISNULL(login_fail_count, 0) > 0)
        AND (@OnlyWithoutGroup = 0 OR group_sid IS NULL)
    ORDER BY last_login DESC, login_fail_count DESC, name;
END;
GO
