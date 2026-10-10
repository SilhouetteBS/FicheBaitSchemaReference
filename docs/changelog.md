# Changelog

This changelog tracks public data and application changes for FicheBait Schema Reference.

## Unreleased

- Clarified 37 versioned column notes on Reporting-related Forms, LFDS, and Workflow tables. Formula references use exported FK evidence; inferred identity/error descriptions remain inferred and undocumented numeric option mappings remain unknown.
- Accounted for all 520 current metadata warnings and added a deduplicated Reporting-priority notes queue to the ignored maintainer triage report.
- Documented canonical schema imports, authenticated Sites release verification, and rollback of saved versions without rewriting Git history.

- Renamed the project to FicheBait Schema Reference to follow Laserfiche trademark and branding guidance.
- Added descriptive trademark usage and a visible Laserfiche trademark acknowledgement.
- Added public contribution documentation for schema exports.
- Added a data privacy page that explains schema metadata boundaries.
- Added GitHub issue templates for schema export submissions, documentation corrections, and bug reports.
- Added a contribution workflow for proposed documentation notes and duplicate version review.
- Added community-readiness and maintainer triage guidance for issue-only public feedback.
- Added import preview checks for expected files, duplicate versions, and product/version consistency.
- Added schema health queues for needs-documentation prioritization and unresolved dependency review.
- Added table note templates, table-specific reporting examples, glossary terms, and export script compatibility notes.
- Added diagram path finding, built-in diagram presets, edge label modes, object-type filtering, and dependency direction controls.
- Removed `dbo.sysdiagrams` from imported data and added importer/script exclusions so SSMS-created database diagrams are not published.

## Imported Versions

- Forms: `11.0.2311.50564`, `12.0.2503.10378`, `12.0.2509.20409`, `12.0.2603.30215`
- LFDS: `11.0.2403.2474`, `12.0.2506.370`, `12.0.2510.261`, `12.0.2511.289`, `12.0.2603.369`
- Repository: `11.0.2.338`, `12.0.1.237`, `12.0.2.343`, `12.0.3.423`
- Workflow: `11.0.2306.898`, `12.0.2508.3111`, `12.0.2510.3321`, `12.0.2511.266`, `12.0.2605.385`

## Initial Public Baseline

- Static product/version data model
- Tables, compare, diagram, objects, impact, health, dependencies, and reporting views
- Public read-only warning
- Optional local editing mode for internal documentation review
- GitHub Pages deployment workflow
