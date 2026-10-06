---
name: Production release checklist
about: Track validation, deployment, and post-release checks for a public build
title: "Production release: "
labels: release, production
assignees: ""
---

## Scope

- Product/version snapshots included:
- Target deployment URL:
- Release owner:

## Validation

- [ ] `npm ci` completed from a clean checkout.
- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npm run test:diagram`
- [ ] `npm run validate:data`
- [ ] `npm run validate:notes`
- [ ] `npm run verify:lockfile`
- [ ] `npm run verify:static-security`
- [ ] `npm run build`
- [ ] `npm run test:static-build`
- [ ] `npm run verify:public-build`
- [ ] `npm run audit:performance`
- [ ] `npm run audit:accessibility`
- [ ] `npm run test:e2e`
- [ ] `npm run test:visual`

## Public Build Boundary

- [ ] Public build was generated without `VITE_ENABLE_EDITING=true`.
- [ ] Import tab is absent from public navigation.
- [ ] Manual notes editor, notes import, and notes export are absent from public build.
- [ ] Read-only support warning is visible.
- [ ] Known Limitations link is visible.
- [ ] Public docs state this is an unofficial FicheBait community resource, not Laserfiche support documentation.

## Data Review

- [ ] Product/version identity comes from manifests, not SQL Server database names.
- [ ] `docs/privacy-review-checklist.md` was completed for submitted schema exports.
- [ ] Data validation warnings were reviewed against `docs/data-validation-warnings.md`.
- [ ] Missing `views.json` or `triggers.json` exports are intentional.
- [ ] Dependency resolution warnings are expected SQL Server metadata artifacts.
- [ ] No local SQL Server version, database name, or compatibility-level data is displayed.

## Deployment

- [ ] Required validation checks passed.
- [ ] Public build artifact was reviewed before publishing.
- [ ] Changes committed to `main`.
- [ ] Sites deployment completed.
- [ ] `SITE_URL=<final-url> npm run verify:deployed-site`
- [ ] Hosted static paths work under the final base URL.

## Release

- [ ] Release notes generated with `npm run release-notes:draft`.
- [ ] Full diff reviewed.
- [ ] Release tag or marker created.
