/*
Repository page and search diagnostics reporting pattern.

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

CREATE OR ALTER VIEW rpt.vw_RepositoryPageDiagnostics
AS
SELECT
    t.tocid,
    t.parentid,
    t.name AS entry_name,
    t.etype,
    t.vol_id,
    v.vol_name,
    COUNT_BIG(d.page_id) AS page_count,
    SUM(CASE WHEN d.page_id IS NOT NULL AND d.img_bpp > 1 THEN 1 ELSE 0 END) AS likely_color_page_count,
    SUM(CASE WHEN d.page_id IS NOT NULL AND d.img_bpp IN (0, 1) THEN 1 ELSE 0 END) AS likely_black_white_page_count,
    SUM(CONVERT(bigint, ISNULL(d.img_size, 0))) AS image_bytes,
    SUM(CONVERT(bigint, ISNULL(d.txt_size, 0))) AS text_bytes,
    MAX(d.img_bpp) AS max_image_bits_per_pixel,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(RepositoryDatabase)].dbo.toc AS t
LEFT JOIN [$(RepositoryDatabase)].dbo.doc AS d
    ON t.tocid = d.tocid
    AND ISNULL(d.deleted, 0) = 0
LEFT JOIN [$(RepositoryDatabase)].dbo.vol AS v
    ON t.vol_id = v.vol_id
GROUP BY
    t.tocid,
    t.parentid,
    t.name,
    t.etype,
    t.vol_id,
    v.vol_name;
GO

CREATE OR ALTER VIEW rpt.vw_RepositoryActiveDocuments
AS
SELECT
    a.tocid,
    t.name AS entry_name,
    t.parentid,
    a.who,
    a.predecessor,
    a.checked_out,
    SYSUTCDATETIME() AS reporting_read_utc
FROM [$(RepositoryDatabase)].dbo.active_doc AS a
LEFT JOIN [$(RepositoryDatabase)].dbo.toc AS t
    ON a.tocid = t.tocid;
GO

CREATE OR ALTER PROCEDURE rpt.usp_RepositoryPageDiagnostics
    @EntryNameContains nvarchar(255) = NULL,
    @OnlyWithColorPages bit = 0,
    @Top int = 500
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EffectiveTop int = CASE WHEN @Top BETWEEN 1 AND 10000 THEN @Top ELSE 500 END;

    SELECT TOP (@EffectiveTop)
        tocid,
        parentid,
        entry_name,
        etype,
        vol_id,
        vol_name,
        page_count,
        likely_color_page_count,
        likely_black_white_page_count,
        image_bytes,
        text_bytes,
        max_image_bits_per_pixel
    FROM rpt.vw_RepositoryPageDiagnostics
    WHERE
        (@EntryNameContains IS NULL OR entry_name LIKE N'%' + @EntryNameContains + N'%')
        AND (@OnlyWithColorPages = 0 OR likely_color_page_count > 0)
    ORDER BY image_bytes DESC, page_count DESC, tocid DESC;
END;
GO
