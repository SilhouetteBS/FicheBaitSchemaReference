# Production Readiness

Use this checklist before publishing the FicheBait Schema Reference to a public static host.

## Build Boundary

- Public deployments must build without `VITE_ENABLE_EDITING=true`.
- `npm run verify:public-build` must pass before uploading `dist/`.
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

The static app includes a defensive CSP meta tag. Hosts that support HTTP response headers should also send CSP headers because `frame-ancestors` is ignored when delivered through a meta tag.

GitHub Pages is acceptable for the initial public static deployment when the public build checks pass. It does not support arbitrary response headers, so stricter header enforcement requires a host or CDN that can attach headers, such as Azure Static Web Apps, Cloudflare Pages, Netlify, or another reverse proxy in front of the static files.

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
- Confirm `docs/community-readiness-runbook.md` is current for public issue triage and maintainer release workflow.
- Confirm data validation warnings have been reviewed against `docs/data-validation-warnings.md`.
- Confirm the hosted URL passes `npm run verify:deployed-site`.
