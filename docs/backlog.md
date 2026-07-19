# FicheBait Schema Reference Backlog

This backlog tracks functional, design, coding, performance, security, and production-readiness improvements for the public read-only FicheBait Schema Reference.

This is a public product backlog. Do not add private research notes, customer-specific details, database names, server names, credentials, screenshots of records, or sensitive submission review notes here.

## Functional Improvements

1. Add a "What changed in this version?" summary per product/version, not just raw compare details.
2. Add common reporting questions that map business questions to likely tables, columns, and joins.
3. Add saved/shareable filtered URLs for tables, diagrams, objects, and compare views.
4. Add a global "Find anything" search across tables, columns, views, routines, triggers, notes, and definitions.
5. Add a related objects panel on every table/object page showing foreign keys, dependencies, routines, and views that touch it.
6. Add a confidence legend explaining Unknown, Inferred, Observed, Confirmed, Deprecated, and Do not rely.
7. Add safe reporting guidance per table: read-only usage, cautions, and whether the table looks stable across versions.
8. Add schema coverage gaps: versions/products missing from the public dataset and what exports are needed.
9. Add version-to-version change severity: low, medium, high based on table removals, column type changes, key changes, and foreign key changes.
10. Add a breaking-changes-only filter.
11. Add changed-column detail filters: added, removed, type changed, nullability changed, key/index changed.
12. Add side-by-side table definition comparison.
13. Add first-seen and last-seen for tables/columns across imported versions.
14. Add version trend pages per table showing how that object evolved.
15. Add diagram path finding: show how table A connects to table B.
16. Add diagram presets for common areas: users/security, process instances, tasks, repository fields, workflow runtime, and LFDS identities.
17. Add edge labels that can be toggled between minimal, column pair, and full foreign key name.
18. Add a show-only-selected-object-type filter for table/view/routine/trigger.
19. Add dependency direction controls: referenced by, references, both.
20. Add note templates for tables: purpose, safe reporting use, join notes, version caveats, known columns.
21. Add a review workflow for public contributions: proposed notes as JSON or Markdown, reviewed before publishing.
22. Add needs-documentation queues sorted by relationship density or likely reporting importance.
23. Add examples tied directly to tables: queries using this table.
24. Add glossary terms for Laserfiche-specific concepts.
25. Add an import checklist that shows which expected files are present/missing before import.
26. Add duplicate/version collision warnings before replacing an existing version.
27. Add import validation for product/version consistency across all JSON files.
28. Add unresolved dependency drilldown with likely reasons and suggested fixes.
29. Add export script version compatibility notes.
30. Add a public "Contribute schema exports" page with exact SQL export steps and privacy assurances.
31. Add a data privacy page explaining that only schema metadata is collected, not row data.
32. Add a changelog page for newly imported versions and UI improvements.
33. Add an analytics-free feedback loop, such as GitHub issue templates for user feedback.
34. Add GitHub issue templates for schema export submission, documentation correction, and bug report.
35. Add a community readiness runbook for issue triage, schema review, documentation review, validation, and publishing.
36. Add issue-only contribution guidance across public docs.
37. Add maintainer triage labels for schema exports, documentation, bugs, enhancements, and privacy review.
38. Add privacy handling guidance for sensitive issue attachments.
39. Add duplicate product/version replacement review guidance.
40. Add documentation review guidance tied to the Health tab needs-documentation queue.
41. Add unresolved dependency review guidance with likely reasons and suggested fixes.
42. Add public build boundary checks for editing-disabled releases.
43. Add release validation command tiers for small changes and full public releases.
44. Add deployed-site verification instructions.
45. Add accessibility review guidance for icon buttons, menus, tooltips, tabs, cards, diagram nodes, and connectors.
46. Add tooltip placement guidance so explanatory text does not hide under navigation.
47. Add dense-table usability guidance for type, purpose, status, and version text.
48. Add diagram usability guidance for compact controls and visible canvas space.
49. Add performance guidance for large table, column, object, and dependency lists.
50. Add static security verification guidance.
51. Add dependency audit guidance.
52. Add CSP and HTTP security header guidance for future hosts beyond GitHub Pages.
53. Add AI export package maintenance guidance.
54. Add AI export instruction guidance requiring users to choose product and version.
55. Add no-row-data guidance for AI export artifacts.
56. Add changelog maintenance guidance for imported versions and user-visible changes.
57. Add contribution guide maintenance guidance for public version coverage.
58. Add known limitations maintenance guidance.
59. Add public-backlog hygiene guidance that excludes private research and customer-specific data.
60. Add schema export review steps for required and optional JSON files.
61. Add manifest identity review steps for product key, product name, product version, and database role.
62. Add documentation correction review steps for current wording, proposed wording, and source context.
63. Add support boundary guidance that this is unofficial and read-only.
64. Add release checklist coverage for privacy, validation, and deployment verification.
65. Add local editing mode guidance for maintainers only.
66. Add public issue template coverage for feature requests and production release checks.
67. Add guidance to close pull requests and redirect contributors to issues.
68. Add ongoing maintenance guidance for docs, data, AI exports, validation, and backlog review.

## Current Focus

Items 1-68 have initial implementations in the app or repository documentation. Future passes can refine the interaction design and expand coverage, but these backlog entries should now be treated as shipped baseline functionality rather than pending feature requests.
