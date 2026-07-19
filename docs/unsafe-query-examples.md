# Unsafe Query Examples

Do not run write operations against Laserfiche product databases for documentation, reporting, or troubleshooting.

## Avoid

```sql
UPDATE dbo.SomeLaserficheTable SET SomeColumn = 'value';
DELETE FROM dbo.SomeLaserficheTable WHERE ...;
INSERT INTO dbo.SomeLaserficheTable (...) VALUES (...);
MERGE dbo.SomeLaserficheTable AS target USING ...;
ALTER TABLE dbo.SomeLaserficheTable ...;
DROP INDEX ... ON dbo.SomeLaserficheTable;
```

## Why

Direct writes can corrupt product state and bypass application logic. Laserfiche product database modification is unsupported; consult your applicable license and support agreements. This project is for read-only metadata documentation only.

## Queue Processing Exclusions

The reviewed Laserfiche Answers SQL queue includes examples that are useful as cautionary references but should not be published as runnable scripts here. Excluded examples include:

- Direct `UPDATE`, `DELETE`, `INSERT`, or `MERGE` statements against Laserfiche product tables.
- Schema changes, indexes, or stored objects created inside a Laserfiche product database.
- Repair scripts that change queue state, task state, document metadata, security, licensing, or identity records.
- Environment-specific emergency recovery snippets that require Laserfiche Support direction.

When an Answers post includes both read-only diagnostics and direct-write remediation, this project may document the diagnostic pattern separately and leave the write operation out.
