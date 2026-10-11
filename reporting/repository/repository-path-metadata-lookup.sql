/*
Repository path and metadata lookup reporting pattern.

Target: reporting database, not the Repository product database.
Product schema evidence: Repository 12.0.4.433 export; read-only sample review.

Usage:
  1. Open in SQL Server Management Studio with SQLCMD Mode enabled.
  2. Set RepositoryDatabase to the repository product database name.
  3. Execute from the reporting database where rpt objects should live.
*/

:setvar RepositoryDatabase "Repository"

IF SCHEMA_ID(N'rpt') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA rpt AUTHORIZATION dbo;');
END;
GO

CREATE OR ALTER VIEW rpt.vw_RepositoryEntries
AS
SELECT
    t.tocid,
    t.parentid,
    parent.name AS parent_name,
    t.name AS entry_name,
    t.etype,
    CASE t.etype
        WHEN 0 THEN N'Folder'
        WHEN -2 THEN N'Document (observed)'
        ELSE N'Unknown'
    END AS entry_type_name,
    t.created,
    t.modified,
    t.creator,
    t.toc_owner,
    t.vol_id,
    v.vol_name,
    t.pagecount,
    t.textcount,
    t.edoc_size,
    t.edoc_mime,
    t.edoc_ext,
    t.pset_id,
    ps.pset_name,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(RepositoryDatabase)].dbo.toc AS t
LEFT JOIN [$(RepositoryDatabase)].dbo.toc AS parent
    ON t.parentid = parent.tocid
LEFT JOIN [$(RepositoryDatabase)].dbo.vol AS v
    ON t.vol_id = v.vol_id
LEFT JOIN [$(RepositoryDatabase)].dbo.propset AS ps
    ON t.pset_id = ps.pset_id;
GO

CREATE OR ALTER VIEW rpt.vw_RepositoryFieldValues
AS
SELECT
    t.tocid,
    t.name AS entry_name,
    t.parentid,
    t.etype,
    t.created,
    t.modified,
    pd.prop_id,
    pd.prop_name,
    pd.display_name AS field_display_name,
    pd.prop_type,
    pv.pos,
    pv.pos2,
    pv.str_val,
    pv.short_str_val,
    pv.num_val,
    pv.date_val,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(RepositoryDatabase)].dbo.propval AS pv
JOIN [$(RepositoryDatabase)].dbo.propdef AS pd
    ON pv.prop_id = pd.prop_id
JOIN [$(RepositoryDatabase)].dbo.toc AS t
    ON pv.tocid = t.tocid;
GO

CREATE OR ALTER VIEW rpt.vw_RepositoryPageInventory
AS
SELECT
    t.tocid,
    t.name AS entry_name,
    t.vol_id,
    v.vol_name,
    d.pagenum,
    d.page_id,
    d.img_size,
    d.txt_size,
    d.img_width,
    d.img_height,
    d.img_bpp,
    d.deleted,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(RepositoryDatabase)].dbo.doc AS d
JOIN [$(RepositoryDatabase)].dbo.toc AS t
    ON d.tocid = t.tocid
LEFT JOIN [$(RepositoryDatabase)].dbo.vol AS v
    ON t.vol_id = v.vol_id;
GO

CREATE OR ALTER PROCEDURE rpt.usp_FindRepositoryEntries
    @EntryNameContains nvarchar(255) = NULL,
    @FieldName nvarchar(255) = NULL,
    @FieldValueContains nvarchar(4000) = NULL,
    @FromModified datetime = NULL,
    @Top int = 500
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 10000 THEN @Top ELSE 500 END;

    SELECT TOP (@EffectiveTop)
        e.tocid,
        e.parentid,
        e.parent_name,
        e.entry_name,
        e.entry_type_name,
        e.created,
        e.modified,
        e.vol_id,
        e.vol_name,
        e.pagecount,
        e.textcount,
        e.edoc_size,
        e.edoc_mime,
        e.edoc_ext,
        e.pset_id,
        e.pset_name,
        fv.prop_name,
        fv.field_display_name,
        fv.prop_type,
        fv.str_val,
        fv.short_str_val,
        fv.num_val,
        fv.date_val
    FROM rpt.vw_RepositoryEntries AS e
    LEFT JOIN rpt.vw_RepositoryFieldValues AS fv
        ON e.tocid = fv.tocid
    WHERE
        (@EntryNameContains IS NULL OR e.entry_name LIKE N'%' + @EntryNameContains + N'%')
        AND (@FieldName IS NULL OR fv.prop_name LIKE N'%' + @FieldName + N'%' OR fv.field_display_name LIKE N'%' + @FieldName + N'%')
        AND (@FieldValueContains IS NULL
            OR fv.str_val LIKE N'%' + @FieldValueContains + N'%'
            OR fv.short_str_val LIKE N'%' + @FieldValueContains + N'%')
        AND (@FromModified IS NULL OR e.modified >= @FromModified)
    ORDER BY e.modified DESC, e.tocid DESC;
END;
GO
