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
