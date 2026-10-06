# Production Readiness

Use this checklist before publishing the FicheBait Schema Reference to a public static host.

## Publication Authorization Gate

**Status: unresolved and required before public schema publication.** Written
Laserfiche authorization to redistribute product database schema metadata has
not been established by this project. Do not treat existing public availability,
community discussion, a disclaimer, or access to a licensed system as permission.

Before a production release publishes schema snapshots, retain written
authorization that clearly covers the products and metadata being redistributed,
or obtain qualified legal review confirming another valid publication basis.
Record the decision privately. If this gate is not satisfied, publish only the
application shell and user-supplied local-import workflow, not bundled schemas.

## Build Boundary

- Public deployments must build without `VITE_ENABLE_EDITING=true`.
- `npm run verify:public-build` must pass before uploading `dist/`.
- Pages must deploy the exact `dist/` artifact verified by CI; the privileged
  deployment workflow must not check out or execute repository source.
- Import preview, manual notes editing, notes import, and notes export are local/internal capabilities only.
- Editing-enabled builds should be used only on trusted local machines or private internal hosts.

## Required Validation

Run these commands from a clean checkout:

```powershell
npm ci
npm run validate
npm run validate:full
npm run verify:public-build
```

For a hosted deployment, verify the deployed URL:

```powershell
$env:SITE_URL='https://example.com/FicheBaitSchemaReference/'
npm run verify:deployed-site
```

## Data Provenance

Each published product/version should have:

- `productKey` and `productVersion` supplied by the export manifest
- `databaseRole` describing the Laserfiche product database role
- export timestamp normalized as UTC when available
- source export script version when available
- schema and notes files present in `public/data`

Do not use the SQL Server database name as a product or version identifier. Database names vary by customer and environment.

## Security Headers

The static app includes a defensive CSP meta tag. `frame-ancestors` is excluded
because browsers ignore it when delivered through a meta tag. Hosts that support
HTTP response headers should send the full policy, including
`frame-ancestors 'none'`.

Sites hosts the static deployment. Verify the host's actual HTTP response headers before claiming that the recommended header baseline is enforced; the app's CSP meta tag alone does not enforce every header below.

Recommended header baseline:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Header status for the current static build:

- CSP meta tag: included in `index.html`.
- HTTP `Content-Security-Policy`: host-dependent; required for enforceable `frame-ancestors`.
- `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`: host-dependent; add them on any host that supports response headers.

## Launch Checks

- Confirm `LICENSE`, `CONTRIBUTING.md`, and `SECURITY.md` are present.
- Confirm public docs state that this is an unofficial FicheBait community research aid, is not affiliated with or endorsed by Laserfiche, and is not Laserfiche support documentation.
- Confirm `Import` is absent in the public navigation.
- Confirm table notes editor controls are absent in the public build.
- Confirm the support warning is visible.
- Confirm `docs/known-limitations.md` is current.
- Confirm `docs/privacy-review-checklist.md` was used for submitted schema exports.
- Confirm the publication authorization gate is satisfied and privately documented.
- Confirm `docs/community-readiness-runbook.md` is current for public issue triage and maintainer release workflow.
- Confirm data validation warnings have been reviewed against `docs/data-validation-warnings.md`.
- Confirm the hosted URL passes `npm run verify:deployed-site`.
