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

## Documentation coverage follow-up — 2026-11-02
- Recompared the API export catalog to the current root, server, network and SEO barrels: all **690 unique exported names** are represented in `docs/3/api/exports.md`. This is exact-name inventory coverage, not a claim that every signature, option or runtime behavior has been independently exhaustively tested.
- Confirmed the Gen 3 React/JSX integration guide explicitly supports ordinary Next.js App Router pages, Server/Client Components, JSX/TSX, HTML and composition via `createComponent()`/`createPage()`.
- Reconciled third-party package ranges with `main-3/package.json`: Next.js, React/React DOM, next-view-transitions, Three.js, Two.js, react-markdown and remark-gfm. Auth.js, Clerk and Supabase Auth are documented as application-level providers, not built-in Engine adapters.
- Follow-up source-backed edits: EngineCanvas callback typing/client boundary + public `adaptive` default; low-level `useEngineCanvas()` reference; EngineScroll facade/method/option map; EngineTheme `createTheme()` generic signature and runtime registry option; NENC command/dispatcher/session/replay/rate/device-proof contracts.
- Canvas callback examples now narrow the Canvas2D/WebGL/WebGL2 context union and show the Client Component boundary.
- Website viewer implementation remains in the separate `Kate-alt-69/kastrick` PR #14. It maps docs/2 to `main-2` and docs/3 to `main-3`; updated Engine PR branches become the live viewer source after they are merged to those upstream branches.
- Commits on this branch: EngineCanvas `50f0ed5`; EngineScroll `9aa23b5`; NENC `78a3d95`; EngineTheme `3fb3924`; React/JSX `86904a6`.
- Local type-check, production build, and site preview were not run in this connector-only session. Recheck CI and run the repository's required checks before merging.

## Final content cleanup
- Consolidated the Gen 3 EngineCanvas low-level hook reference into a single section; removed its superseded duplicate copy (`3f202fa`).
- Completed the EngineScroll facade method map with `initialize()` and corrected the literal hash target type (`d8a9731`).
- Final content pass rechecked the Canvas, Scroll, Theme, NENC and React/JSX headings and examples for duplicate sections and source-contract mismatches.

## Additional documentation pass — 2026-11-03
- Corrected the dedicated EngineTheme API page and the Create API page to show `createTheme(definition, options?)`, its `CreateEngineThemeOptions.registry`, `EngineThemeDefinition` generic and readonly return contract. `registry` is runtime-only and is not serialized in `.etr` data.
- Expanded the public EngineScheduler guide with `EngineSchedulePolicy` defaults, snapshot states, `useEngineSchedule()` / `useEngineVisible()` behavior, imperative observe/cleanup, frame-pressure subscriptions, idle scheduling and IntersectionObserver fallback.
- Expanded EngineModel with typed usage, key-level versus full-state hooks, public methods, action/computed behavior, shallow update semantics and development-only inspection caveats.
- Expanded EngineViewport with the complete snapshot fields, visual/layout viewport distinctions, SSR snapshot, React hook and measurement lifecycle.
- Expanded EngineSEO API with the generic resolver/builder contract, setter families, Next.js metadata/sitemap/robots results, `EngineSEO.generate()` and Open Graph ImageResponse options.
- Additional Gen 2 correction: `docs/2/module/enginecanvas.md` no longer references an undeclared `finished` variable; its low-level hook example now narrows the WebGL context and performs a bounded one-frame draw.
- Connector-only edits are committed directly to the existing documentation PR branches. No runtime source files or website repository files were changed in this pass.

## Local clone attempt — 2026-11-03
- Container tools available: Git 2.47.3, Node.js 22.16.0 and npm 10.9.2.
- Attempted `git ls-remote https://github.com/Kastrick8/nextjs-engine.git` before cloning; the shell failed with `Could not resolve host: github.com`. Direct container network/DNS access is therefore unavailable in this session and no local repository clone/download was created.
- The connected GitHub repository integration remains available for reading/writing the public PR branches. No local `npm install`, TypeScript check, build or local documentation-site preview was run.
- Next: recheck latest-head CI after these documentation-only commits, continue checking signature-level API examples against source, and run full local checks once a shell with GitHub network access is available.

## Extended component/API audit — 2026-11-03
- Added source-matched EngineForms input/textarea/checkbox prop tables and clarified that EngineForm's named submit/reset handlers are not native React callback props; direct React consumers can use an ordinary HTML form.
- Added EngineLink prop contracts, Gen 3 EngineUrlIcon component/helper signatures, EngineNav item favicon fields, the EngineNavLogo shape and renderEngineAnchor(cfg): ReactElement.
- Expanded EngineImage/EngineVideo lifecycle and media props, including Gen 3 EngineScheduler-backed image controls; added a standalone EngineVideo prop table.
- Added Overlay overlayStyle, direct action callback semantics and the explicit Gen 2/Gen 3 trigger boundary; gave the Overlay quick-start subsections distinct anchors.
- Documented EngineTransitionLink props and its Next.js Link inheritance in Gen 3; added local Markdown prettyPlease and themeTemplates props with links to the detailed EngineTheme guides.
- Expanded CustomSelect's direct React contract with controlled value, callback overload, accessibility/search/empty-state labels and Gen 3 theme slots.
- Source note: Gen 3 CustomSelect currently defaults emptyLabel to the literal string {emptyLabel} whereas Gen 2 defaults to No options found. The docs advise explicitly setting the Gen 3 prop; runtime code was intentionally not changed in these documentation PRs.
- Structural validation on the changed module pages found balanced Markdown code fences and no duplicate real section headings after correcting the accidental joined headings; the duplicate ## API sample in EngineMarkdown is fenced content demonstrating generated heading suffixes.
- No local type-check, production build, or docs-site preview was run because the container cannot resolve GitHub DNS. The current PR workflow checks must pass before merging.
