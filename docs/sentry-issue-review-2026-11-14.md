# Sentry review and source reconciliation

Sites version 37 used `6f7a7c78859a352345ab896ad0a4adf941d9c7c1` and did not contain the maintenance branch fixes. Reconciliation preserves its guide return navigation while incorporating the November 2 and November 9 maintenance changes. Access settings and the custom domain must remain unchanged.

## Issue evidence

- [WEB-1](https://silhouette-web-solutions.sentry.io/issues/7819571301/): documented controlled production ingestion/symbolication checks, not evidence of a customer defect. See `sentry-production.md`.
- [WEB-2](https://silhouette-web-solutions.sentry.io/issues/7821024075/): all four retained events share the schema-network-failure breadcrumb sequence and `TableWorkspace.handleContextPanelChange` stack path. The October 30 20:53:39 UTC event coincides with the recorded local end-to-end suite; that suite deliberately aborts the Forms 11 schema request while loading history, asserts the warning, then verifies retry recovery. November 2 events follow the same path during validation. This strongly supports test-origin alerts, but sanitized telemetry alone does not prove every request's origin. CI now disables real reporting; local validation must also disable it. Production network-error monitoring remains enabled.
- [WEB-3](https://silhouette-web-solutions.sentry.io/issues/7821026527/): one handled render TypeError on October 30 at 20:55:47 UTC; no retained exception frames or original message. Breadcrumbs show successful initial metadata requests followed by another schema/notes request. The historical publication sequence stopped the local preview server shortly before this event. Interrupted lazy loading is plausible, not proven. Keep this issue unresolved pending recurrence or reproduction; do not label it fixed.
- [WEB-4](https://silhouette-web-solutions.sentry.io/issues/7824946589/): November 2 14:18:23 UTC event strongly correlates with the failed Compare CI test. Browser-test URL construction was corrected and subsequent CI passed. The telemetry isolation fix prevents these validation errors from reaching production monitoring.

All four issues were last seen by November 2 at review time. Absence of recurrence alone does not prove remediation. No schema data, confidence levels, access permissions, or monitoring rules were changed by this review.

## Release validation

Full validation (including lint, unit, metadata, diagram, security, build, performance, render and end-to-end checks), ten intercepted diagnostics browser scenarios, accessibility, generated reporting verification and public-build isolation passed. Dependency audit reported zero vulnerabilities. Validation disabled real Sentry delivery. A fresh Windows checkout exposed a CRLF-sensitive export parity test; it now checks both LF and CRLF inputs without changing the SQL.

The production artifact must use a fresh content-derived release and private source-map upload, be verified with ingestion intercepted, and be published unchanged. Record the resulting deployment and issue dispositions in the completion report.
