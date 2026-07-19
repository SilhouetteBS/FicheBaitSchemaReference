# FicheBait Schema Reference

Interactive static web app for documenting Laserfiche® product databases for read-only reporting, troubleshooting, and education.

This is an unofficial FicheBait community research aid. It is not affiliated with or endorsed by Laserfiche, and it is not Laserfiche support documentation. It supports read-only research only; validate changes in a test environment.

Laserfiche is a registered trademark of Laserfiche in the United States and other countries.

## Scope

- Product/version selector backed by static JSON manifests
- Forms 11 and Forms 12 schema snapshots
- Table, column, key, index, trigger, dependency, and relationship views
- Focused database diagram with full-database mode
- Version comparison with selectable source/target versions
- Public read-only mode by default, with optional local manual notes workflow for internal builds
- Schema health, impact, and reporting guide views
- Static JSON/CSV export artifacts

## Support Warning

This project is intended for read-only reporting, troubleshooting, and educational use. Manually writing to or modifying Laserfiche product databases, tables, etc. will violate your Laserfiche Support plan and is not supported.

## Community Use

- Read `LICENSE` before copying, modifying, or redistributing repository contents.
- Use `CONTRIBUTING.md` before submitting feedback, documentation corrections, or schema exports.
- Use `SECURITY.md` for sensitive data exposure reports.
- Use `docs/privacy-review-checklist.md` before importing or publishing submitted schema exports.

## Development

```powershell
npm install
npm run dev
```

The dev server binds to `127.0.0.1`.

For local/internal manual notes editing:

```powershell
npm run dev:editing
```

## Validation

```powershell
npm run lint
npm run test:unit
npm run test:diagram
npm run validate:data
npm run validate:notes
npm run build
npm run render:check
npm run verify:public-build
```

Or run the bundled non-browser validation:

```powershell
npm run validate
```

To regenerate schema-matched Reporting candidates from processed Laserfiche Answers rows:

```powershell
npm run verify:answers-schema
```

This updates `docs/answers-sql-schema-verification-2026-07-01.md` and the generated `src/data/generatedReportingCandidates.js` file. Do not edit generated candidate data by hand.

For browser smoke testing, start the dev server first and then run:

```powershell
$env:CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:APP_URL='http://127.0.0.1:4177'
npm run test:e2e
```

## Build

```powershell
npm run build
```

The built static site is emitted to `dist/` and can be hosted by any static web server.

Public builds are read-only by default. Manual notes editing, notes import, and notes export controls are removed unless editing is explicitly enabled at build/dev time:

```powershell
npm run dev:editing
```

Use editing-enabled builds only for local or internal review. The public static site should be deployed without `VITE_ENABLE_EDITING=true`.

`npm run verify:public-build` builds with editing disabled and fails if editing-only UI strings are emitted into `dist/`.

## Deployment

`.github/workflows/deploy-pages.yml` publishes the static `dist/` folder to GitHub Pages on pushes to `main` and on manual dispatch. The workflow runs `npm run verify:public-build` before upload so the deployed artifact remains read-only.

Before publishing publicly, follow `docs/production-readiness.md`. The public deployment workflow also runs a deployed-site smoke check against the GitHub Pages URL after deployment.

Public project pages:

- `docs/contribute-schema-exports.md`: metadata-only schema export contribution steps.
- `docs/data-privacy.md`: what the project collects and what must not be submitted.
- `docs/privacy-review-checklist.md`: maintainer checklist before import or publication.
- `docs/community-readiness-runbook.md`: issue triage, schema review, validation, public build, and maintenance guidance.
- `docs/reporting-sql-review-workflow.md`: Answers SQL review, schema verification, generated candidates, and promotion workflow.
- `docs/answers-sql-processed-index.md`: index of processed Answers SQL queue batch files.
- `docs/changelog.md`: imported versions and public-facing changes.
- `docs/feedback.md`: analytics-free feedback through GitHub Issues.

## Data Layout

Generated schema files and manual documentation remain separate:

```text
data/
  forms/
    12.0.2503.10378/
      schema.json
      notes.json
public/
  data/
    products.json
    forms/
      versions.json
      12.0.2503.10378/
        schema.json
        notes.json
```

`data/` is the source-side copy. `public/data/` is what the static app fetches at runtime.

Database names are environment-specific and must not be used as product or version identifiers. Use explicit export fields such as `productKey`, `productVersion`, and `databaseRole`.

`npm run validate:data` fails on manifest/schema shape problems, duplicate keys, and broken foreign key targets. SQL expression dependency references that point to aliases, pseudo tables, check constraints, or unexported helper objects are reported as warnings because SQL Server dependency metadata can contain names that are not standalone exported objects.

## Export SQL Metadata

Use `docs/sql-server-schema-export.sql` for Forms, LFDS, Repository, and Workflow exports. It is the single canonical metadata export script; `docs/forms-schema-export.sql` remains only as a compatibility pointer for older links.

The export script requires SQL Server 2016 or newer because it uses `FOR JSON`. It reads SQL Server catalog metadata only. It does not read Laserfiche business table rows and does not modify the database.

This documentation is for read-only reporting, troubleshooting, and education. Manually writing to or modifying Laserfiche product databases, tables, etc. will violate your Laserfiche Support plan and is not supported.

Foreign keys in the app come from exported SQL constraints. Dependencies come from SQL Server expression dependency metadata for views, routines, and triggers; they are useful for impact analysis, but unresolved dependency rows can be aliases, pseudo tables, caller-dependent references, or helper objects that were not exported as standalone objects.

Save each SQL result set as JSON using these names:

```text
manifest.json
schemas.json
tables.json
columns.json
primaryAndUniqueKeys.json
foreignKeys.json
indexes.json
views.json
routines.json
triggers.json
dependencies.json
```

See `docs/schema-export-guide.md` for the full export procedure.

See `docs/contribute-schema-exports.md` for public contribution steps and privacy checks.

See `docs/known-limitations.md` for generated metadata boundaries and public-facing caveats.

See `docs/data-privacy.md` before submitting schema exports or screenshots.

Use `docs/release-checklist.md` before publishing or importing a new product/version snapshot.

Use `docs/diagram-qa.md` when changing diagram layout, connector routing, or table-card styling.

Use `docs/contribution-workflow.md` for note review status, schema export submission expectations, and duplicate version handling.

Use GitHub issue templates for schema export submissions, documentation corrections, bug reports, feature requests, and production release checks.

## Import Schema Exports

Forms default import from `Downloads`:

```powershell
npm run import:forms
```

Forms import from a specific folder:

```powershell
npm run import:forms -- --input-dir "C:\path\to\forms-export"
```

Generic product import, for example LFDS:

```powershell
npm run import:schema -- --product=lfds --product-name="LFDS" --database-role=lfds --input-dir "C:\path\to\lfds-export"
```

The importer updates product/version manifests in `public/data/` and creates empty `notes.json` files when they do not already exist.

## Manual Notes Workflow

Manual notes are available only when `VITE_ENABLE_EDITING=true`. In editing-enabled local/internal builds, use the table detail page to:

- save a local note draft
- import a notes JSON file
- export local browser notes
- export a review-ready `notes.json` shape for the selected product/version

Checked-in notes should stay separate from generated `schema.json` snapshots.

Drafted notes should move through Draft, In review, and Approved before being copied into the static data folders.

## CI

GitHub Actions runs separate jobs for:

- lint and unit tests
- static product/version data validation
- production build and render smoke check
- Playwright browser smoke test
