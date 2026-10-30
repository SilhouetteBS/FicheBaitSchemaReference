# Production error reporting

Sentry project: schema-reference-web in silhouette-web-solutions (US). Only error monitoring is enabled. Project IP storage prevention and geographic sensitive-field scrubbers are enabled.

Reports are reconstructed from an allowlist: fixed site/operation/resource/failure labels, HTTP status when available, release/environment/event IDs, generic exception messages, same-origin built-asset stack locations and debug IDs, and curated breadcrumbs. No search text, URLs/query strings, user or installation identities, request/response bodies, console logs, replay, screenshots or tracing. Client transport omits cookies and referrers. Server geographic enrichment is scrubbed. Rate limits: 10/minute and 50/page lifetime, duplicate suppression 60 seconds, bounded transport.

Run ./tools/build-sentry-production.ps1 from PowerShell to derive a release from browser source/build inputs, load the existing Windows DPAPI-protected build credential outside Git into process memory, build, upload private source maps, and remove maps from public output. This does not deploy. Publish only that exact artifact and matching source through Sites. .env.production contains only public ingestion/build values and is tracked; .env.local and tokens are never committed. Retain existing Sites access lists.

For offline privacy checks run npm run test:diagnostics. Test browser traffic with ingestion intercepted before sending any controlled event. Production checks must never include real customer content or queries. To disable, explicitly override VITE_SENTRY_ENABLED=false for a rebuilt artifact and publish through the normal authorized workflow.

Pre-publication validation passed against the exact production artifact: normal browser rendering/interactions, intercepted privacy checks, one accepted synthetic production event (706ed5b5052a45f09b4b91d18a951ad5), original-source symbolication and filtered geography verified in Sentry. Issue: https://silhouette-web-solutions.sentry.io/issues/7819571301/ . No real customer data was used. Existing restricted Sites audience must be preserved.
