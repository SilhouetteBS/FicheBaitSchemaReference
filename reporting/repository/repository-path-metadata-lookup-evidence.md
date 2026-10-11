# Repository Path and Metadata Lookup Evidence

Product/version: Repository `12.0.4.433` (current structural checks and sample review; not live tested)

## Goal

Provide read-only entry, volume, page, template, and field metadata lookup objects for reporting databases.

## Confirmed Schema Evidence

- `dbo.toc.parentid` points to parent entries in `dbo.toc`.
- `dbo.toc.vol_id -> dbo.vol.vol_id`.
- `dbo.toc.pset_id -> dbo.propset.pset_id`.
- `dbo.propval.tocid -> dbo.toc.tocid`.
- `dbo.propval.prop_id -> dbo.propdef.prop_id`.
- `dbo.doc.tocid -> dbo.toc.tocid`.

## Queue Sources Processed

- [How to mimic a repository search using a SQL query?](https://answers.laserfiche.com/questions/156668/How-to-mimic-a-repository-search-using-a-SQL-query)
- [Feature Request: Ability to use Lookup Rules in Forms to query metadata in repository](https://answers.laserfiche.com/questions/207941/Feature-Request--Ability-to-use-Lookup-Rules-in-Forms-to-query-metadata-in-repository)
- [Query to see how many pages in repository are in color and black & white?](https://answers.laserfiche.com/questions/168368/Query-to-see-how-many-pages-in-repository-are-in-color-and-black--white)
- [SQL query on LF Server tables for specific metadata](https://answers.laserfiche.com/questions/201363/SQL-query-on-LF-Server-tables-for-specific-metadata)
- [What table in SQL is the document path located?](https://answers.laserfiche.com/questions/67002/What-table-in-SQL-is-the-document-path-located)
- [Audit trail on Number of Records in Each Folder](https://answers.laserfiche.com/questions/154758/Audit-trail-on-Number-of-Records-in-Each-Folder)
- [Folder name in dbo.toc different to repository](https://answers.laserfiche.com/questions/207423/Folder-name-in-dbotoc-different-to-repository)
- [Checking A Field Value from the Form to see if it exists in Repository](https://answers.laserfiche.com/questions/173171/Checking-A-Field-Value-from-the-Form-to-see-if-it-exists-in-Repository)
- [Restore after Metadata Field Type change](https://answers.laserfiche.com/questions/164669/Restore-after-Metadata-Field-Type-change)
- [Retrieving values from an index list item](https://answers.laserfiche.com/questions/224419/Retrieving-values-from-an-index-list-item)
- [Count the number of documents a template is assigned to per day](https://answers.laserfiche.com/questions/105169/Count-the-number-of-documents-a-template-is-assigned-to-per-day)
- [wait condition sticky note](https://answers.laserfiche.com/questions/117562/wait-condition-sticky-note)

## Cautions

- Read-only Repository `12.0.4.433` UI correlation observed ordinary folders with etype 0 and documents with -2. Unverified codes now remain Unknown rather than assigning unsupported Document/Shortcut labels. Other builds require independent validation.
- The field-value view retains both pos and pos2. Multiple values can multiply entry rows; nonzero pos2 alone does not establish repeating-group membership. Page inventory counts image-page rows, not pages inside electronic files. These samples do not mean this script was live tested.

- Repository metadata tables can be very large. Use filters, TOP limits, and reporting snapshots for repeated reports.
- `bin_val` is intentionally excluded from the public pattern because it can contain binary metadata.
- The script avoids `NOLOCK`; add it only for explicitly accepted dirty-read diagnostics.
