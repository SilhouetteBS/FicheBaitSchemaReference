# Release Checklist

## Import And Release Procedure

1. Review the publication authorization gate in `docs/production-readiness.md`. Existing deployment is not evidence of permission. Preserve the current authenticated Sites audience; do not broaden access as part of an import.
2. Record the currently deployed Sites version ID/number, its source commit, access policy, and live URL privately before replacing it. Confirm the working tree is clean and capture the proposed source commit separately from deployment status.
3. Keep received exports outside Git. Apply `docs/privacy-review-checklist.md`, confirm product/version from the manifest, and confirm missing optional exports with the contributor. Never infer identity from the database name or fill gaps from another version.
4. Import with `npm run import:schema -- --input-dir '<private export folder>'`. Review canonical `data/<product>/<version>` and the version manifest. Existing notes must be retained; review replacements explicitly. Do not stage raw exports, credentials, or private triage artifacts.
5. Run `npm run prepare:data`, `node tools/triage-metadata.mjs`, and inspect `artifacts/metadata-triage.json`. Investigate new categories and baseline increases before changing a warning baseline. Keep unresolved references and confidence limitations visible.
6. Install with `npm ci` if dependencies are not current. Build, then start a separate local preview terminal before checks that fetch the app:

```powershell
npm run build
npm run preview -- --port 4177 --strictPort
```

In another terminal, run:

```powershell
$env:APP_URL='http://127.0.0.1:4177'
npm run validate:full
npm run test:visual
npm run audit:accessibility
npm run verify:public-build
```

7. Inspect the diff, commit only the reviewed work, push GitHub, and require its checks to pass. Read `.openai/hosting.json` and reuse its Sites project ID. Use the Sites source workflow to push the same commit and package the verified static build; never persist or expose its short-lived credential.
8. Save a Sites version with that exact source commit and artifact, then deploy that saved version. A saved version or successful GitHub push is not a successful publication. Wait for a terminal successful deployment and record its version, commit, and URL privately.
9. In a signed-in browser, verify the changed product/version, notes, Reporting links, and refresh/deep-link behavior. Verify editing controls remain absent. Anonymous requests to the homepage, catalog, and AI exports should be denied for the current authenticated audience. Separately test invited-viewer success and uninvited-account denial; record Not exercised rather than claiming acceptance without those accounts. `verify:deployed-site` is an anonymous public-host checker and is not an authenticated Sites acceptance test.
10. Stop the local preview server and confirm no unexpected generated changes remain. Update the changelog for meaningful data/user-visible changes.

## Rollback

- If post-deployment checks fail, redeploy the previously successful saved Sites version recorded above, without rebuilding it or substituting a different archive. Preserve the audience and invite list. Verify terminal deployment success and repeat the relevant signed-in and anonymous-denial checks.
- Rollback of hosting does not undo GitHub commits. Record which source commit is live; investigate locally. Revert only the identified faulty commit with a normal reviewed Git revert when appropriate, then run the same checks for the corrective release. Do not reset shared history or discard unrelated work.
- If the previous artifact is unavailable, stop and investigate; do not claim rollback succeeded based on a source checkout. Recover the exact known-good commit in a separate clean checkout and validate/rebuild through the normal release procedure.
- Never restore private exports or credentials from an artifact. Access-policy failures require correcting access as well as selecting a known-good build; an artifact rollback alone does not repair permissions.

Use this checklist before publishing a public build or adding a new product/version snapshot.

## Data

- Confirm product and version identity comes from `products.json`, `versions.json`, and schema metadata, not from the SQL database name.
- Keep generated `schema.json` separate from manual `notes.json`.
- Run `npm run validate:data` after every import.
- Run `npm run validate:notes` when manual notes change.
- Confirm missing `views.json` or `triggers.json` exports are intentional for that product/version.
- Review data validation failures for duplicate object keys, orphaned foreign keys, and missing dependency targets.
- Review dependency resolution stats and confirm unresolved references are expected SQL Server metadata artifacts.

## Diagram

- Smoke test Full database mode for the largest imported product.
- Smoke test Focused mode with one outgoing foreign key.
- Smoke test Focused mode with multiple outgoing foreign keys.
- Smoke test Focused mode with incoming foreign keys.
- Smoke test dependency mode with a routine that references a table.
- Confirm connector lines align in the open gap between table boxes.
- Confirm relationship cards and highlighted connectors match the same foreign key.
- Confirm relationship card hover/focus dims non-selected connectors.
- Confirm object-type filters hide Views, Routines, and Triggers when selected.

## Public Build

- Run `npm run lint`.
- Run `npm run test:unit`.
- Run `npm run test:diagram`.
- Run `npm run validate:data`.
- Run `npm run validate:notes`.
- Run `npm run verify:lockfile`.
- Run `npm run verify:static-security`.
- Run `npm run build`.
- Run `npm run test:static-build`.
- Run `npm run verify:public-build`.
- Run `npm run audit:performance`.
- Run `npm run audit:accessibility`.
- Run `npm run test:e2e` against a local server.
- Run `npm run test:visual` against a local server.
- Confirm editing-only UI is absent in the public artifact.
- Confirm the read-only support warning and Known Limitations link are visible.

## Documentation

- Update `README.md` when commands, data layout, or deployment behavior changes.
- Update `docs/schema-export-guide.md` when export filenames or SQL scripts change.
- Update `docs/contribute-schema-exports.md` when public product/version coverage changes.
- Update `docs/community-readiness-runbook.md` when intake, validation, public build, or publishing expectations change.
- Confirm `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, and `docs/privacy-review-checklist.md` are current.
- Record known product-specific export gaps in the import notes or release notes.
