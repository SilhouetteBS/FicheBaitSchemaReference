# Schema Reference Sentry pilot (local implementation; unpublished)

## Account and credential setup

The pilot uses the React project `schema-reference-web` in the existing `silhouette-web-solutions` organization (US region). Its public client DSN is configured in ignored `.env.local`. The DSN is a public ingestion identifier, not an administrative token. This pilot accepts hosted Sentry HTTPS DSNs only, including regional ingestion hosts.

For readable source-mapped stacks, configure a narrowly scoped build/CI source-map upload token in a secret store or the local build process environment as `SENTRY_AUTH_TOKEN`. Do not paste the token into chat, commit it, put it in a VITE_* variable, or include it in a deployment archive. Confirm the chosen Sentry organization region before sending real events. Live ingestion and source-map symbolication have been verified with a controlled local staging event. Project IP-address prevention is enabled. Alerts, account quotas and retention still require release review.

## Explicitly enable a build

Copy `.env.example` to ignored `.env.local`, then set:

- `VITE_SENTRY_ENABLED=true`
- `VITE_SENTRY_DSN`: the project DSN
- `VITE_SENTRY_ENVIRONMENT=staging` (or `production` for an approved production build)
- `VITE_SENTRY_RELEASE=schema-reference@<exact-source-commit-or-unique-build-id>`

The suffix must contain 7-100 letters, digits, periods, underscores or hyphens. Never reuse a release ID for changed source. The example stays disabled. The account-connected local staging artifact is enabled only through explicit local/build configuration; no production deployment has occurred. Editing-enabled builds forcibly disable reporting. Enabled builds with incomplete/invalid configuration fail rather than silently ship partial setup.

For source-map upload, additionally supply these **process environment** values to the same `npm run build` that produces the intended artifact:

- `SENTRY_UPLOAD_SOURCEMAPS=true` (this explicitly permits an upload to Sentry)
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

No upload takes place without that explicit flag. The plugin disables its own telemetry. Upload failure fails the build. Hidden maps are generated for upload-enabled builds and deleted after upload; the postbuild cleanup also removes any remaining maps from dist. Do not publish a failed or unverified build. Do not run a second build after map upload and publish that different artifact. The existing CI validates code but does not publish Sites. This change does not add any publishing, source synchronization, commits or pushes.

## Exact event policy

The final SDK hook reconstructs events from a small allowlist. It sends:

- Event ID, event timestamp, JavaScript platform, error severity, site, exact release, environment.
- Fixed operation labels: browser.unexpected, react.render, data.load, schema.validate, navigation.restore, version.change, product.change, export.download.
- Fixed resource category (products/versions/schema/notes/other), failure category (network/http/json/validation), HTTP status when available.
- Up to three exception entries with permitted exception types; every exception message is replaced with a fixed operation label.
- Up to 30 stack frames per exception: only this site's built /assets/*.js locations, line/column, and in-app flag. Queries, fragments, function names, locals, source context and external frames are removed.
- Valid debug IDs and corresponding sanitized asset locations for matching source maps.
- Up to 20 curated data-loading/export breadcrumbs, containing only fixed labels and the approved categories/status.

No search terms, query parameters, referrers, page URLs, selected objects, SQL, notes, imported files, user/account/installation IDs, IP fields, cookies, headers, request/response bodies, console output, environment dumps, screenshots, attachments, sessions, replay, tracing or broad logs are collected by the integration. Browser/OS context is omitted in this initial minimal pilot. Standard SDK integrations are disabled except global error/rejection handlers. The browser transport omits credentials and referrer headers. Source IP and browser User-Agent remain visible to receiving infrastructure as part of ordinary HTTPS; verify account-side IP handling separately. Browser blockers can prevent delivery.

One report is emitted at the data failure boundary; wrapper exceptions preserve causes to prevent duplicate reports. AbortErrors are excluded. Identical sanitized failures are suppressed for one minute. Limits are ten accepted events per minute and fifty per page lifetime, with a ten-item transport buffer. There is no persistent offline cache or visitor identifier. The limiter resets on reload; account quotas remain necessary. Existing recovery UI and local console behavior are preserved.

The built CSP permits only the DSN's specific ingestion origin, and only when reporting is enabled. It never permits a wildcard Sentry origin or externally hosted scripts.

## Validation and rollout

- `npm run test:diagnostics`: policy/configuration/rate-limit tests with planted sensitive fields.
- `npm run test:diagnostics:browser`: builds enabled/disabled variants using a dummy DSN, intercepts all ingestion locally, injects browser/render/data failures, checks the complete envelope and transport headers, verifies CSP/debug IDs/absence of public maps, tests blocked delivery, and leaves a disabled artifact.
- Existing unit, diagram, static-security, public-build, dependency, browser and performance checks remain applicable.

Account-free tests cannot prove real project routing, Sentry grouping, server-side IP policy, alert delivery, or source-map symbolication. Once account details are available, validate a controlled staging report and its readable stack against the matching uploaded artifact. Production publishing requires a separate instruction.

To disable an enabled site, rebuild with `VITE_SENTRY_ENABLED=false` and deploy through the normal approved release process. This is build-time configuration, not a live remote switch. No website has been deployed by this implementation.

## Account-connected local validation

Created `schema-reference-web` in `silhouette-web-solutions` (US region), project ID `4512342792142848`. Only error monitoring is selected. The DSN and content-derived release identifier are in ignored `.env.local`. No site publication occurred.

The approved organization token `schema-reference-local-sourcemaps` has `org:ci` scope (source-map upload, releases and code mappings). This is organization-wide, not project-restricted. Its value is stored only as a Windows current-user DPAPI-encrypted blob at `%LOCALAPPDATA%\FicheBait\BuildSecrets\schema-reference-sentry.dpapi`, outside the repository. `tools/build-sentry-local.ps1` decrypts it into process memory for the build, restores the prior environment afterward, and does not deploy. Copying the encrypted blob to another Windows account or machine is not a supported credential transfer.

Run the approved local source-map build from PowerShell with `./tools/build-sentry-local.ps1`. This performs a real upload to Sentry and leaves the matching enabled staging artifact in `dist/`; source maps are absent from public output. The token is not present in the client bundle.

The explicit smoke command is `$env:SENTRY_LIVE_SMOKE="true"; $env:VITE_SENTRY_ENABLED="true"; node tools/sentry-live-smoke.mjs`. Each invocation sends one synthetic event; it checks the full outgoing envelope before allowing transmission, including absence of user data, URL/search content, cookies and referrer headers. Do not run it as a routine offline test.

The initial accepted event was `c488ea8a85544072b95221cc3ed23281`, release `schema-reference@pilot-db0d18ea5ff9b6f1`, environment `staging`, issue `SCHEMA-REFERENCE-WEB-1` (`7819571301`). Sentry mapped the top frame to `src/data/productLoader.js:54:23`, followed by the original data-loader and main application frames. Its generic message, HTTP 503 category, curated breadcrumbs, zero users, no URL and no attachments/replays matched the client policy.

Live validation revealed that Sentry derives geography before stripping IP addresses. Therefore, the project additionally scrubs `geo`, `city`, `subdivision`, `region`, `country_code`, and `ip_address`, following Sentry guidance: https://www.sentry.help/en/articles/13964201-can-i-disable-ip-geolocation-for-gdpr-compliance . Sentry says this change may take 5-15 minutes to propagate. Scrubbing is not retroactive: the first synthetic event retained derived city/country, while IP storage was already disabled. No customer traffic was used.

Final live check: accepted event `44fe0c81a8c94a6f88ae17902605cdc0` grouped into the same `SCHEMA-REFERENCE-WEB-1` issue. Its geography is `[Filtered], [Filtered] ([Filtered])`, its source-mapped top frame remains `src/data/productLoader.js:54:23`, and the expected staging release is present. Two synthetic events were sent in total. The first event remains in the issue history with its earlier server-derived geography; no events were deleted. The client never supplied geographic or user data.

The validated artifact remains in `dist/` and is enabled for staging. Normal local configuration remains disabled by default; use the explicit build helper to reproduce a connected staging build. No source-map files or build-token text remain in the public output. No production site was published, and no source commit or push was made. Existing unit/privacy tests, static-security, lockfile, static-build, dependency audit and performance checks passed after account connection.
