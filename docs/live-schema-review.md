# Live Schema Review

Read-only database and product-UI reviews informed the notes for Forms `12.0.2607.40144`, LFDS `12.0.2607.421`, Repository `12.0.4.433`, and Workflow `12.0.2605.385`. These are version-specific sample observations, not vendor specifications or exhaustive behavioral verification. Earlier-version notes are not upgraded by association.

## Evidence Levels

- **Observed**: directly supported by an exported structural constraint, a reviewed value relationship, or an independently correlated product-UI sample. Read the purpose text for the exact scope; an observed sample does not establish every enum value.
- **Inferred**: a plausible purpose based on names, types, or context without independent behavioral confirmation.
- **Unknown**: insufficient evidence for units, encoding, enum labels, payload formats, or behavior. An empty table cannot establish these meanings.
- **Confirmed**: reserve for authoritative evidence; a successful sample correlation alone does not promote a note to Confirmed.

Table-level coverage does not verify every column. Aggregates can establish join coverage in the reviewed dataset without proving lifecycle rules, effective permissions, or universal referential integrity. SQL examples remain not live tested unless separately executed and validated.

## Reporting Cautions

| Product | Supported guidance | Remaining limits |
| --- | --- | --- |
| Forms | Main-instance status alone can hide suspended workers. Preserve raw values when formatted rows are absent; checkbox selection and form/submission context matter. | Internal option codes, payload formats, and universal identity conversions are not established. |
| LFDS | Interpret account categories per table. Preserve optional license aliases with LEFT JOIN; sample license totals do not define a universal accounting formula. | Disabled/service-account flag decoding, nested scope behavior, and empty federation/SCIM scenarios remain unverified. |
| Repository | Distinguish image-page count from electronic-file pages and history versions from link-group numbers. Multi-value field joins can multiply entries. | Nonzero pos2 alone is not a universal repeating-row test; permissions, internal masks, and complete type enums remain unverified. |
| Workflow | Interpret status codes per table. History, rights, and reporting records can lack current/detail parents. Current activity end_time is not completion proof; work_time units are unknown. | Complete status/action/type mappings, timestamp storage conventions, and behavior of empty queue/completion tables remain unverified. |

Workflow table-level coverage comprised 53 populated tables with sample, aggregate, lookup, or UI evidence and 23 empty tables inventoried. This does not certify every column or reporting script. Further semantic verification requires authoritative documentation or explicitly authorized controlled scenarios, not invented mappings.

## Privacy

Private research stays outside Git and deployment artifacts. Public notes contain only generalized findings: no row exports, personal identities, environment endpoints, connection values, security masks, definitions, credentials, or tokens. Database identity comes from the selected product/version, not an environment-specific name. Cross-product joins require separate evidence and are not implied by matching column names or SQL types.
