/*
LFDS user and license inventory reporting pattern.

Target: reporting database, not the LFDS product database.
Product schema evidence: LFDS 12.0.2607.421 export; read-only sample review.

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

CREATE OR ALTER VIEW rpt.vw_LfdsDirectoryUsers
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
    ul.type AS license_type,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(LfdsDatabase)].dbo.directory_objects AS o
LEFT JOIN [$(LfdsDatabase)].dbo.identity_providers AS p
    ON o.provider_id = p.id
LEFT JOIN [$(LfdsDatabase)].dbo.user_logins AS l
    ON o.sid = l.sid
LEFT JOIN [$(LfdsDatabase)].dbo.user_licenses AS ul
    ON o.sid = ul.sid;
GO

CREATE OR ALTER VIEW rpt.vw_LfdsLicenseContainerLimits
AS
SELECT
    id AS container_limit_id,
    license_uuid,
    resource_uuid,
    instances,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(LfdsDatabase)].dbo.container_limits;
GO

CREATE OR ALTER VIEW rpt.vw_LfdsSamlSidMappings
AS
SELECT
    saml.saml_sid,
    saml.lf_sid,
    lf_user.name AS lf_directory_object_name,
    lf_provider.name AS lf_identity_provider_name,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(LfdsDatabase)].dbo.saml_lf_sid_mappings AS saml
LEFT JOIN [$(LfdsDatabase)].dbo.directory_objects AS lf_user
    ON saml.lf_sid = lf_user.sid
LEFT JOIN [$(LfdsDatabase)].dbo.identity_providers AS lf_provider
    ON lf_user.provider_id = lf_provider.id;
GO

CREATE OR ALTER PROCEDURE rpt.usp_LfdsUserLicenseInventory
    @NameContains nvarchar(255) = NULL,
    @OnlyWithLicense bit = 0,
    @OnlyWithLoginFailures bit = 0,
    @Top int = 500
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 10000 THEN @Top ELSE 500 END;

    SELECT TOP (@EffectiveTop)
        directory_object_id,
        name,
        object_type,
        flags,
        identity_provider_name,
        identity_provider_type,
        login_fail_count,
        last_login_fail_time,
        last_login,
        last_login_target_app,
        license_type
    FROM rpt.vw_LfdsDirectoryUsers
    WHERE
        (@NameContains IS NULL OR name LIKE N'%' + @NameContains + N'%')
        AND (@OnlyWithLicense = 0 OR license_type IS NOT NULL)
        AND (@OnlyWithLoginFailures = 0 OR ISNULL(login_fail_count, 0) > 0)
    ORDER BY last_login DESC, name;
END;
GO
