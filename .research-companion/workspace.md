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

## Animation, Canvas, SVG and primitive follow-up — 2026-11-03
- Expanded EngineManim with exact 2D/3D configuration tables, shape/timeline contracts and direct React component prop signatures. The direct React example is now a self-contained Client Component.
- Documented Gen 3 `Manim3DConfig.materialSrc` for OBJ Wavefront `.mtl` files and the `$root` bone-transform target; added the EngineScheduler frame-pressure note for animated Manim3D.
- Corrected the EngineCanvas compatibility boundary: Gen 3 accepts `adaptive` and `adaptiveTargetFps` for call-site compatibility, but does not adapt DPR, lower backing resolution, or throttle RAF to that target. `adaptiveTargetFps` timing is browser-delivered.
- Clarified that `engine: "skia"` is registered but currently throws because its CanvasKit backend is a stub; use `2d` or `3d` for a working renderer.
- Added EngineSVG public helper signatures (`exportSVG(scene, width, height): string`, browser-only `importSVG(svgSource): ECNode[]`) and documented the exported `ECRenderingEngine` contract.
- Expanded primitives common-prop coverage, corrected the Button `type` contract and EngineLink schema callback type, added Box axis gaps, Gen 3 external URL icon props and EngineTheme primitive style slots. Added direct EngineCard `coverClassName` and theme style props.
- Structural validation covered the Gen 3/Gen 2 primitives, Canvas, Manim, SVG and Shader pages plus Gen 3 Nav/Hero/Image/Video/Overlay pages: all scanned pages had balanced code fences and unique actual headings.
- Local clone/build/type-check/site preview remain unavailable because outbound DNS to GitHub is blocked in the container. The GitHub connector remains the only repository editing/inspection path used.

 
## Engine3D scene-model audit — 2026-11-03
- Expanded `docs/3/module/engine3d.md` with a self-contained Client Component quick start, root-exported EC scene factories/types, topology and mesh-metric semantics, camera defaults, material behavior, retained identity/update rules and renderer lifecycle.
- Added a cross-link from `docs/3/module/enginecanvas.md` to the focused Engine3D reference.
- Cross-checked the 3D API against `src/engine/core/enginecanvas/ECTypes.ts`, `ECGraphicsModel.ts`, `Engine3D.ts`, `RenderingEngine.ts`, `ECEngineRegistry.ts`, `src/engine/core/enginecanvas/index.ts` and the root `src/engine/index.ts` barrel.
- The EC model types/factories, Engine3D implementation, RenderingEngine contract, and EngineCanvas engine registry have matching source blob hashes on `main-2` and `main-3`; the documentation is therefore shared for this 3D contract while the Canvas runtime's generation-specific adaptive-DPR behavior remains documented separately.
- Source-backed limits recorded in the guide: Engine3D uses unlit MeshBasicMaterial/LineBasicMaterial; surface strokes and strokeWidth are not applied; only rim shading adds a back-face shell; custom environment currently sets a solid background color; there is no public light/shadow/HDRI/sky/floor/texture asset API in this renderer; SVG-like paths support M/L/H/V/C/Q/Z with curves flattened to segments.
- Factory-created mesh metric methods close over the vertex/index arrays supplied at creation. The guide recommends creating a fresh mesh from a factory when replacing geometry rather than mutating the typed-array fields on an existing factory-created mesh.
- Connector edits only; no local clone, type-check, build or documentation-site preview was available because the container still cannot resolve GitHub DNS.


## NE-CLI updater safety and PR audit — 2026-11-04

### Scope and branches
- Repository: `kastrick8/nextjs-engine`.
- Generation 3 updater safety: PR [#93](https://github.com/kastrick8/nextjs-engine/pull/93), branch `fix/ne-cli-update-safety-main3-ready`, target `main-3`.
- Generation 2 updater safety: PR [#94](https://github.com/kastrick8/nextjs-engine/pull/94), branch `fix/ne-cli-update-safety-main2-ready`, target `main-2`.
- The safety branches contain the respective CLI help/runtime fixes from PRs #88 and #89 as ancestors. Compare result: #88 → #93 is 19 commits ahead / 0 behind; #89 → #94 is 19 ahead / 0 behind. Merge the help PR first, then the safety PR after refreshing its CI.

### Safety behavior verified in source
- Installed generation is read from the installed package manifest, with managed NE state used only when it matches that installed version; generation falls back to SemVer major when needed.
- Selected generation prefers the release source branch (`main-2` / `main-3`) and falls back to version metadata.
- SemVer downgrade, generation change, static compatibility findings, and explicit non-interactive acknowledgement flags are enforced before dependency changes.
- Known Gen 3 incompatibilities `RawComponentRenderer` and schema `type: "raw"` block installation. The schema scan checks every `type:` key and reports remediation guidance.
- Unknown target/installed generation is fail-closed. After the package-manager install, NE verifies exact package name/version and expected generation; mismatch triggers the existing restore path.
- TUI review requires a separate acknowledgement; `--yes` alone does not bypass risk flags or hard blockers.

### Scope limitation
- Preflight is a bounded static source scan (up to 500 files / 1 MiB each in configured app/pages/components/lib roots). It is not a full dependency-tree, npm audit, TypeScript, peer-dependency, or runtime compatibility proof. No such checks are claimed as part of this PR.
- Local repository checkout and package execution were not available: previous shell attempt could not resolve GitHub DNS. Verification must rely on GitHub Actions here; do not claim a local `npm run test:cli`, build, or type-check.

### Open PR audit snapshot
- #77 and #83: independent Gen 3 EngineTheme changes; last observed workflows green, but both were behind `main-3` and need branch refresh/current-head checks.
- #80: security/Code Quality remediation; keep absolutely last per maintainer instruction. Its PR description records one Code Quality annotation and CodeQL alert #70 as explicit review items.
- #84: rolling Alpha package-root/release workflow on `main-3`; draft, downstream of package migration work.
- #85 then #90: package dist-tag correctness, then package-only Git tag snapshots on `package/main`; #90 depends on #85. Latest #85 validation passed; #90 validation was still running at audit time.
- #88 then #93: Generation 3 CLI runtime/help, then updater safety.
- #89 then #94: Generation 2 CLI runtime/help, then updater safety.
- #91/#92: package-root Git-tag installation support; stacked on #88/#89 and not operational for old tags until the package-tag migration is applied.
- #95: default-branch package-root publish workflow; depends on #84 and the package/main helper delivered by #90; refresh its base before CI/review.
- #55 is a stale draft with superseded EngineOverlay theme contract; #77 is the discrete replacement. Do not merge #55.
- Previously merged: #78, #79 and #81.

### Merge order and safety
1. Refresh and merge #88 / #89, then refresh and merge #93 / #94 respectively.
2. Merge independent #77 / #83 after refreshing each against current `main-3` and rerunning required checks.
3. On `package/main`, merge #85 then #90 after #90 validation passes.
4. Merge #84 after the package helper is present, then refresh and merge #95.
5. Inspect the tag migration with `apply=false`; only run `apply=true` after an explicit maintainer decision. No live tag refs were rewritten in this audit.
6. Merge #91/#92 only after their base CLI PRs are merged, tag migration is complete, and fresh checks pass.
7. Merge #80 absolutely last, after all other intended main-3 changes, refreshing it and reviewing its outstanding Code Quality annotation / alert #70 first.

No PR was merged, no npm publication was made, and no live Git tag was changed during this work.
