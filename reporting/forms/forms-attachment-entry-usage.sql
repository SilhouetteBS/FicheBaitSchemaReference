/* Forms attachment entry-ID associations. Read-only; not live tested.
   Run in the selected Forms database; its database name is not assumed.
   Set @EntryId from a known reference. Counts include deleted attachment rows.
   Repeated numbers do not prove corruption or identify a repository.
*/
DECLARE @EntryId int = NULL;
IF @EntryId IS NULL OR @EntryId <= 0
    THROW 50000, 'Set @EntryId to a known positive repository-entry reference.', 1;

SELECT
    a.lfentry_id,
    COUNT(DISTINCT a.attachment_id) AS attachment_count,
    COUNT(DISTINCT d.bp_data_id) AS mapped_data_count,
    COUNT(DISTINCT s.bp_instance_id) AS distinct_instance_count
FROM dbo.cf_bp_attachment_data AS a
LEFT JOIN dbo.cf_bp_data_attachment_mapping AS m ON m.attachment_id = a.attachment_id
LEFT JOIN dbo.cf_bp_data AS d ON d.bp_data_id = m.bp_data_id
LEFT JOIN dbo.cf_submissions AS s ON s.submission_id = d.submission_id
WHERE a.lfentry_id = @EntryId
GROUP BY a.lfentry_id;

SELECT DISTINCT TOP (1000)
    a.attachment_id,
    a.bp_id,
    a.is_deleted,
    d.submission_id,
    s.bp_instance_id
FROM dbo.cf_bp_attachment_data AS a
LEFT JOIN dbo.cf_bp_data_attachment_mapping AS m ON m.attachment_id = a.attachment_id
LEFT JOIN dbo.cf_bp_data AS d ON d.bp_data_id = m.bp_data_id
LEFT JOIN dbo.cf_submissions AS s ON s.submission_id = d.submission_id
WHERE a.lfentry_id = @EntryId
ORDER BY a.attachment_id, d.submission_id, s.bp_instance_id;
