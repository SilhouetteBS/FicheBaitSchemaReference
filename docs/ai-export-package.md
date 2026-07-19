# AI Export Package

The AI export package is a generated, machine-readable version of the FicheBait Schema Reference. It is intended for AI-assisted read-only SQL generation, SQL review, schema navigation, and reporting-database design.

It does not contain row data. It contains exported schema metadata, documentation notes, relationship metadata, object dependencies, and product-specific query context.

## Location

Generated files are written to both locations:

- `data/ai`
- `public/data/ai`

The public copy is deployed with the static site under `/data/ai`.

## Regenerate

Run this after importing or correcting schema versions:

```powershell
npm run generate:ai-export
```

The full validation script also regenerates the package:

```powershell
npm run validate
```

## Files

The root catalog is:

```text
/data/ai/catalog.json
```

The AI instruction entry point is:

```text
/data/ai/assistant-instructions.md
```

Each product/version folder contains:

```text
summary.json
tables.jsonl
columns.jsonl
relationships.jsonl
objects.jsonl
dependencies.jsonl
query-context.md
```

## Intended AI Workflow

For query generation:

1. Read `assistant-instructions.md`.
2. Read `catalog.json` to select the product/version.
3. If the user has not supplied a product and version, ask for them before generating SQL.
4. Read that version's `query-context.md` for support boundaries, common reporting paths, and examples.
5. Search `tables.jsonl` for candidate tables.
6. Use `columns.jsonl` to validate column names, data types, purpose notes, and confidence labels.
7. Use `relationships.jsonl` for confirmed SQL Server foreign keys.
8. Use `objects.jsonl` and `dependencies.jsonl` when reviewing views, stored procedures, triggers, and expression dependencies.
9. Generate read-only SQL and cite the product/version, tables, columns, and relationship evidence used.

For SQL review:

1. Ask for the target product and version if they are missing.
2. Extract referenced objects and columns from the user's SQL.
3. Match them to `tables.jsonl`, `columns.jsonl`, and `objects.jsonl`.
4. Validate joins against `relationships.jsonl`.
5. Treat joins not found in `relationships.jsonl` as inferred unless the user supplies additional evidence.
6. Flag undocumented columns, ambiguous dependencies, unsupported write operations, and row-multiplication risks.
7. Suggest corrected SQL, safer aliases, clearer filters, and reporting-database objects when useful.

## Safety Boundary

This package is for read-only reporting, troubleshooting, and education. Manually writing to or modifying Laserfiche product databases, tables, etc. will violate your Laserfiche Support plan and is not supported.

Generated views, stored procedures, indexes, staging tables, and helper tables should be placed in a separate reporting database unless there is a supported product-specific reason to do otherwise.
