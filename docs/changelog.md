# Changelog

This changelog tracks public data and application changes for FicheBait Schema Reference.

## Unreleased

- Reworded the notice, About dialog, and guide to describe Schema Reference as an independent database schema reference, consistent with Error Helper's independent-reference wording.

- Consolidated header help into an accessible Help menu with User Guide, About, and Feature Requests. Added how-it-works context and color-matched tag/diagram legends to the guide, with a return link preserving the current reference view. The external suggestion form currently returns HTTP 404; product preselection cannot yet be verified.

- Made structural object changes the default comparison view, with counted filters for all changes and definition-only changes. Definition fingerprints now appear in expandable technical details with copy controls; missing fingerprints are distinguished from proven text changes and functional impact remains unconfirmed.

- Recovered 188 output columns for all 19 latest-build Forms, Repository and Workflow views from owner-supplied exports, with matching definition hashes and unchanged manual notes.
- Added a standalone view-column recovery importer that rejects mismatched snapshots, incomplete exports and conflicting metadata.

- Fixed the Windows local editing launcher without enabling shell command execution and added cross-directory launch regression tests.
- Added a bounded Forms attachment entry-ID association diagnostic, with column checks across all imported Forms builds, source context and explicit Not live tested status.
- Clarified attachment join-count and repository-scope limitations and listed the exact remaining view metadata exports needed.

- Restored the responsive header's full accessible product name, verified its separate logo in render checks, and improved subtitle contrast with matching accessibility coverage.
- Updated vulnerable Vite and transitive Zod tooling versions while retaining the current supported major versions.
- Unified the default and unit test commands, removed duplicate metadata preparation, and enabled CI for maintainer review branches without requiring a pull request.

- Screened all 3,361 table columns in the four latest reviewed builds; enriched 318 purposes with exported foreign-key references and corrected or qualified 24 misleading date/time descriptions without upgrading runtime confidence.
- Reconciled 67 Repository/Workflow column claims, corrected three schema-only confidence labels, and documented the remaining filing-date and view-metadata evidence gaps.
- Added view output-column metadata to the SQL export, importer, snapshot validation and AI export, with a metadata-only views recovery script and automated regression coverage.
- Added explicit empty-table limitations for trusted-login, instance-completion and task-queue reporting.

- Reviewed all 60 unresolved dependency targets with explicit evidence categories; no missing object definitions were invented or warnings suppressed.
- Clarified all 64 remaining Reporting-priority column notes across 329 versioned entries, including identity/join evidence, opaque-value limitations, and safe handling of design/diagnostic payloads. Recorded review dispositions in `docs/metadata-note-review.md`.

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
