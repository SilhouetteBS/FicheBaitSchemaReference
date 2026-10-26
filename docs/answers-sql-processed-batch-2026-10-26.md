# Answers SQL Review: 2026-10-26

Four previously untracked posts were processed. Public metadata only; no application rows, private screenshots, identities, installation settings or raw source excerpts were added. The private reviewed-post ledger was updated to avoid repeat processing.

| Product | Source | Disposition |
| --- | --- | --- |
| Forms | [Duplicate entry IDs saving in multiple instances v12](https://answers.laserfiche.com/questions/237458/Duplicate-entry-IDs-saving-in-multiple-instances-v12) | Promoted an original, bounded read-only adaptation: `forms-attachment-entry-usage.sql`. Every referenced column exists in all five imported builds. Not live tested; repository identity and business meaning remain unverified. |
| LFDS | [creating a silent install for laserfiche 12](https://answers.laserfiche.com/questions/238502/creating-a-silent-install-for-laserfiche-12) | Excluded from Reporting: installation/configuration discussion with no reusable product-database SQL or schema references. |
| Repository | [Inquiry About Retrieving Transaction Creation and Modification Dates from the Laserfiche Database](https://answers.laserfiche.com/questions/238059/Inquiry-About-Retrieving-Transaction-Creation-and-Modification-Dates-from-the-Laserfiche-Database) | Retained as context only. `dbo.toc` exists in all imported versions, but the captured material did not establish a reusable SQL query or universal transaction-date semantics. No date meanings were inferred. |
| Workflow / Forms | [How do I publish a Data Query Rule to Forms?](https://answers.laserfiche.com/questions/238363/How-do-I-publish-a-Data-Query-Rule-to-Forms) | Excluded from Reporting SQL: product-configuration/integration discussion; no matched internal objects or extractable query. Automated write-risk labels based on prose were not accepted as evidence of a destructive query. |

The Forms attachment notes now warn about repository scope and join fan-out without increasing confidence labels. Full source posts remain linked for context.
