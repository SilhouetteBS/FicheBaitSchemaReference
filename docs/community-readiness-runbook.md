# Community Readiness Runbook

Use this runbook to keep the public FicheBait Schema Reference useful, safe, and maintainable.

## Community Intake

- Accept community feedback through GitHub Issues only.
- Close pull requests and direct the submitter to the matching issue template.
- Do not ask users to attach row data, screenshots of production records, database names, server names, credentials, or connection strings.
- Ask schema contributors to identify product, product version, export date, and which expected JSON files are included.
- Ask documentation contributors to provide product, version, object, current wording, proposed wording, and non-sensitive source context.
- Never accept raw or sanitized schema files through public Issue attachments or
  public download links. Use the public issue for metadata-only triage, then
  provide private intake instructions for sanitized output.

## Maintainer Triage

1. Confirm the issue uses the closest available template.
2. Apply labels for `schema-export`, `documentation`, `bug`, `enhancement`, `privacy-review`, or `needs-triage`.
3. Move sensitive submissions out of public view before discussing details.
4. Confirm whether the request affects public data, UI, docs, import tooling, or release process.
5. Keep private investigation notes outside the repository.

## Schema Export Review

1. Run the public privacy checklist before importing.
2. Confirm `manifest.json`, `schemas.json`, `tables.json`, and `columns.json` are present.
3. Confirm optional files are present or intentionally empty/missing.
4. Confirm `productKey`, `productName`, `productVersion`, and `databaseRole` come from the manifest.
5. Reject exports that use SQL Server database names as product identity.
6. Treat duplicate product/version submissions as replacement requests.
7. Run the Import tab in an editing-enabled local build before copying files into `public/data`.
8. Confirm the package was produced by the current sanitized export script and
   contains no source IDs, row counts, owner names, object dates, extended
   descriptions, or SQL module bodies.

## Documentation Review

- Start with the Health tab Needs documentation queue.
- Prioritize unknown or inferred tables with many relationships, indexes, triggers, or unknown columns.
- Use the table note template for purpose, safe reporting use, join notes, version caveats, and known columns.
- Keep confidence conservative unless the note has been reviewed.
- Use `Do not rely` for columns that should not be used in reports.

## Release Validation

Do not publish bundled Laserfiche schema snapshots until the written-publication
authorization gate in `docs/production-readiness.md` is satisfied. The project
currently records that authorization as unresolved; do not infer permission
from prior publication.

Run the focused checks for small documentation changes:

```powershell
npm run lint
npm run build
```

Run the full local validation before publishing data, diagram, import, routing, or release-process changes:

```powershell
npm run validate
npm run validate:full
npm run verify:public-build
```

After deployment:

```powershell
$env:SITE_URL='https://silhouettebs.github.io/FicheBaitSchemaReference/'
npm run verify:deployed-site
```

## Public Build Boundary

- Build public releases without `VITE_ENABLE_EDITING=true`.
- Confirm Import and manual note editing controls are absent from the public build.
- Keep the read-only support warning visible.
- Keep Known Limitations reachable from the public app.

## Accessibility And Usability

- Preserve keyboard access for buttons, menus, tabs, cards, diagram nodes, and diagram connectors.
- Ensure icon-only buttons have `aria-label` and `title`.
- Keep tooltip text visible above the main content and away from the left navigation.
- Verify dense tables do not clip type, purpose, status, or version text.
- Keep diagram controls compact enough that the canvas remains the primary focus.

## Performance

- Run `npm run audit:performance` before public releases.
- Avoid rendering unbounded table, column, object, or dependency lists without limits.
- Keep generated AI export files static and cache-friendly.
- Prefer derived summaries over expensive repeated calculations in render loops.

## Security

- Run `npm run verify:static-security` and `npm run audit:dependencies`.
- Keep CSP meta tags in the static build.
- Prefer a host or CDN that can add HTTP security headers when moving beyond GitHub Pages.
- Do not publish editing-enabled builds.

## AI Export Package

- Regenerate AI exports after schema or note changes:

```powershell
npm run generate:ai-export
```

- Confirm AI instructions tell users to pick product and version before asking for query help.
- Do not include row data in AI export artifacts.

## Ongoing Maintenance

- Update `docs/changelog.md` when imported versions or user-visible behavior changes.
- Update `docs/contribute-schema-exports.md` when public version coverage changes.
- Update `docs/known-limitations.md` when a limitation is discovered or resolved.
- Keep backlog entries public, generic, and free of customer-specific details.
