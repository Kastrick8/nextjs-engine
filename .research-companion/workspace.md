# Workspace Memory — nextjs-engine

## Repository
- Repository: `kastrick8/nextjs-engine`
- Branch under documentation work: `docs/comprehensive-reference-main3`
- PR: [#81 — Generation 3 documentation](https://github.com/Kastrick8/nextjs-engine/pull/81)
- Target branch: `main-3`
- Inspected source package version: `3.0.0-alpha.1`
- Inspected source entrypoints: `src/engine/index.ts`, `server.ts`, `network.ts`, `seo.ts`

## Durable decisions
- The public API is defined by the package entrypoint barrels, not every export within a private source file.
- Generation 3 has distinct client/shared, server-only, network and SEO entrypoints.
- Public API pages own symbols/signatures; module pages own user-facing behavior; NE pages own private architecture and operations.
- One cohesive system with many implementation files remains one module page; split only distinct public contracts.
- Migration and release materials remain in the repository but are excluded from the primary documentation navigation.
- Existing example projects remain in place and are not moved by the documentation work.

## Verified source coverage
- 318 JS/TS source files across `src/`, `bin/` and `scripts/` on the inspected main-3 tree.
- 388 unique first-party JS/TS blobs across main-3 and main-2 after deduplicating identical blobs.
- An additional 64 unique tracked project/config/app/example/test blobs outside those source directories were inspected across both branches.
- Recursive Git tree response was not truncated.

## Current task and next actions
- Add exact public export inventory for all Generation 3 package entrypoints.
- Explain the API relationships and source ownership.
- Correct EngineAPIResolver/APIStatic examples against source and smoke tests.
- Recheck links and PR head/CI after committing.
- Re-read this file and current branch source before continuing in another session.

## Tooling note
Research Companion skills guided the audit and note format. This host session did not expose a local repository checkout or the plugin's local helper scripts, so this snapshot was written through the authorized GitHub repository connector; no local helper execution is claimed.
