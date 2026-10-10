# Data Validation Warning Review

The data validator currently passes with warnings. These warnings are reviewed as data quality signals, not release-blocking errors, unless they move outside the expected classes below.

## Current Summary

- Total warnings: 520 across 21 product/version snapshots (2026-10-09 review).
- Dependency references resolved: 3,105 of 3,878. Resolution counts include exported objects, not constraint sources or trigger pseudo-tables.
- Products covered: Forms, LFDS, Repository, Workflow
- Version coverage comes from each canonical `data/<product>/versions.json`, not this document.
- Regenerate the detailed, ignored maintainer report with `node tools/triage-metadata.mjs` after `npm run prepare:data`. Its category counts must sum to the warning total; unclassified warnings require review.

## Expected Warning Classes

| Warning class | Count | Release impact |
| --- | ---: | --- |
| Table has no exported primary key | 397 | Schema observation, not proof of corruption or an import failure. Preserve it; do not invent a key or recommend adding one to a product database. |
| Referencing dependency object not exported | 45 | Export evidence required: Workflow 12.0.2511.266 has dependencies originating from 10 missing views. Obtain that exact version's views export; never copy another version. |
| Referenced dependency object not exported | 60 | Keep unresolved. Some Forms names match exported routine parameter types, but type definitions are absent. Other helper/external/alias-like names need evidence before classification. |
| Empty views or triggers export | 18 | Confirm against the source export. Empty does not prove the product/version has no such objects; the Workflow missing views are a known counterexample. |

Counts are versioned warning occurrences, not unique objects. Expected check-constraint sources and trigger `inserted`/`deleted` pseudo-tables are separately classified, not silently converted into resolved tables. Raw dependency records remain intact.

The triage report also lists unknown column notes with curated Reporting script titles. This is a table-level relevance queue, not proof that a script reads every column. Review FK/type evidence first; names alone support only an inference. Serialized payload formats, numeric option mappings, permission bits, and cross-product identity joins remain unknown without independent evidence.

## Target Evidence Review

All 60 unresolved target occurrences were reviewed on 2026-10-10. These categories are evidence dispositions, not newly resolved dependencies; the 520-warning baseline is unchanged.

| Evidence category | Occurrences | Required follow-up |
| --- | ---: | --- |
| Type name appears in the referencing routine's parameters | 35 | Obtain exact-version type catalog metadata, type schema, and table-type columns/keys where applicable. |
| Type name appears only in other routines in the same snapshot | 10 | Verify the actual dependency class and qualified type identity; same-name evidence elsewhere is not proof of this target. |
| Reference originates from dbo.sp_upgraddiagrams | 4 | Review non-product diagram-support provenance; do not infer a Laserfiche product table. |
| Unqualified target without type evidence | 10 | Privately inspect the exact-version source or sanitized catalog evidence; neither aliases nor external objects are proven. |
| Qualified target without type evidence | 1 | Review LFDS dbo.LF_UserInfo -> dbo.hr_adsi in 12.0.2511.289 using exact-version catalog evidence. |

The type-name group covers Forms_TaskPredictionData, Forms_IdList, Forms_TaskResumeIds, and Forms_SubmissionIds. Parameter exports do not include type schemas/definitions, so no table structure or callable signature was invented. The other unqualified names are e, entry_lock, and lock_info. No target was confirmed external by the sanitized exports.

Microsoft documents sp_upgraddiagrams as [Database Diagram Designer support](https://learn.microsoft.com/en-us/ssms/visual-db-tools/set-up-database-diagram-designer-visual-database-tools). This supports reviewing its four dtproperties references separately from product dependencies; a matching routine name does not prove the exported definition is stock Microsoft code. Raw records remain unchanged.

For the reviewed Reporting-column notes and remaining evidence gaps, see [Metadata Note Review](metadata-note-review.md).

## Release-Blocking Warning Changes

Treat these as blockers until reviewed:

- New validator errors.
- Foreign key source or referenced table missing.
- Schema `productKey` or `productVersion` mismatch against the product/version manifest.
- Missing schema or notes files referenced by a manifest.
- Duplicate product keys, duplicate versions, or duplicate table keys.
- A new warning class that is not listed in this document.

## Identity Rules

Product and version identity must come from exported manifest fields:

- `productKey`
- `productName`
- `productVersion`

Do not infer identity from a SQL Server database name. Customer database names can differ between environments.

## Local Environment Metadata

Local SQL Server metadata such as server version, database name, or compatibility level is intentionally not displayed in the app-facing schema snapshots. Those values vary by customer environment and are not stable product documentation.
