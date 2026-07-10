/*
  This compatibility pointer intentionally contains no executable SQL.

  Use docs/sql-server-schema-export.sql for Forms, LFDS, Repository, and
  Workflow metadata exports. Keeping one executable export script prevents
  product-specific copies from drifting apart.

  For a Forms export, set these values in the canonical script:
    @ProductKey = N'forms'
    @ProductName = N'Forms'
    @ProductVersion = N'<installed Forms version>'
    @DatabaseRole = N'forms'
*/
