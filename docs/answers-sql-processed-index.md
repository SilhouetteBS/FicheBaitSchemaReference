# Answers SQL Processed Queue Index

This index explains the public processed-queue documents used by the Reporting SQL review workflow. These files intentionally list public-safe metadata only: product, status, risk, title, disposition, and source link.

## Batch Files

| File | Purpose |
| --- | --- |
| `docs/answers-sql-processed-batch-2026-10-26.md` | Four new posts; one curated Forms diagnostic, three context/exclusion dispositions. |
| `docs/answers-sql-processed-exclusions.md` | Initial public-safe list of rows that were processed but not promoted. |
| `docs/answers-sql-processed-additional-batch-2026-06-30.md` | Additional 2026-06-30 batch with promoted-script notes and remaining dispositions. |
| `docs/answers-sql-processed-batch-2026-06-30-2.md` | Second 2026-06-30 batch. |
| `docs/answers-sql-processed-batch-2026-06-30-3.md` | Expanded 2026-06-30 batch. |
| `docs/answers-sql-processed-batch-2026-07-01.md` | Continuous 2026-07-01 batch. |
| `docs/answers-sql-schema-verification-2026-07-01.md` | Schema-verification report for rows previously marked `Needs schema verification`. |

## Current Schema Verification Outcome

The 2026-07-01 schema verification pass reviewed 236 raw rows and 234 unique Answers posts.

| Product | Schema-matched candidates | No referenced objects captured |
| --- | ---: | ---: |
| Forms | 0 | 46 |
| LFDS | 0 | 22 |
| Repository | 40 | 40 |
| Workflow | 54 | 32 |

Schema-matched candidates are generated into `src/data/generatedReportingCandidates.js` and displayed in the Reporting guide as `Needs review` entries. No-reference rows remain in the report only.
