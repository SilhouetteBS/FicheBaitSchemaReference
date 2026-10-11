# Workflow Definition and History Evidence

Product/version: Workflow `12.0.2605.385`

## Goal

Provide read-only inventory for Workflow definitions, current version metadata, modification history, and code/assembly payload sizes.

## Confirmed Schema Evidence

- `dbo.workflow` stores workflow identity, name, description, internal name, and current version.
- `dbo.workflow_history.workflow_id` aligns with `dbo.workflow.workflow_id` and stores action, version, template flag, and modification date.
- `dbo.workflow_code.workflow_id` and `version` align with the current workflow definition code row.

## Queue Sources Processed

- [Workflow Last Modified Date](https://answers.laserfiche.com/questions/142410/Workflow-Last-Modified-Date)

## Cautions

- Workflow `12.0.2605.385` read-only aggregate review found history rows without a matching current workflow. The view uses FULL OUTER JOIN to preserve those records as well as definitions without history, with historical identity/name fallbacks. Absence does not establish why a definition is missing.
- Code timestamps and byte counts describe the current definition's code, not each history version. They are NULL when no current definition/code row resolves. One definition can have multiple history rows; do not count view rows as distinct workflows.
- History action codes remain untranslated because a complete action mapping was not independently established. Schema checks and sample review do not mean this script has been executed or performance-tested live.

- Workflow history can expose operator IDs and implementation details.
- Raw workflow definition code and assemblies are intentionally not selected; the script exposes byte counts for diagnostics.
- Deploy reporting objects outside the Workflow product database.
