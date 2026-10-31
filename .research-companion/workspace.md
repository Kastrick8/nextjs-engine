# Workspace Memory — nextjs-engine / Generation 2

## Repository
- Repository: `kastrick8/nextjs-engine`
- Branch: `docs/comprehensive-reference-main2`
- PR: [#82 — Generation 2 documentation](https://github.com/Kastrick8/nextjs-engine/pull/82)
- Target: `main-2`
- Inspected package version: `2.7.0`
- Public entrypoints: `src/engine/index.ts`, `src/engine/server.ts`

## Durable decisions
- Public API means named exports from package entrypoint barrels, not every export statement in implementation files.
- Gen 2 has a root entrypoint and minimal server device entrypoint only; no `network` or `seo` subpath.
- Public API docs own exports/signatures; module docs own user-facing behavior; NE docs own internal architecture.
- Keep Gen 2 distinct from Gen 3; do not port Gen 3 compiler, NENC, EngineTheme factory, SEO, scheduler/model/viewport or scoped registry.
- Migration/release source material stays in the repository but outside primary docs navigation.
- Existing examples remain in place.

## Verified coverage
- 140 tracked JS/TS files in `src/`, `bin/`, `scripts/` on main-2.
- 318 on main-3; 70 exact blobs shared; 388 unique source blobs across both branches.
- An additional 64 unique tracked app/config/example/test files outside those source folders were inspected.
- Recursive tree was not truncated.

## Current state
- Full Generation 2 root/server export inventory is in [API exports](../docs/2/api/exports.md).
- API interactions, internal module relationships and source map are in `docs/2/api/` and `docs/2/ne/`.
- Re-read current branch source before continuing after any upstream changes.

## Tooling note
Research Companion skills guided the audit and note structure. This host did not provide a local checkout or bundled helper scripts, so the snapshot was committed through the authorized GitHub connector. No local helper execution is claimed.
