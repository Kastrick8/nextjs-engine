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

## Documentation coverage follow-up — 2026-11-02
- Recompared the API export catalog to the current root and server barrels: all **350 unique exported names** are represented in `docs/2/api/exports.md`. This is exact-name inventory coverage, not proof that every signature, option, or runtime behavior is exhaustively covered.
- Confirmed the Gen 2 React/JSX guide explicitly permits conventional Next.js pages and React components, native JSX, hooks, forms and third-party libraries, and distinguishes `createComponent()` from schema-driven `createPage()`.
- Reconciled third-party package ranges with `main-2/package.json`: Next.js, React/React DOM, next-view-transitions, Three.js and Two.js. Gen 2 does not declare the Gen 3 react-markdown/remark-gfm package pair or NENC/EngineTheme contracts.
- Fixed the Gen 2 EngineCanvas and JSX examples to show the Client Component boundary and narrow the callback context union before using Canvas 2D-only methods. The Gen 2 public adaptive default remains `true`, matching the stable source.
- Commits on this branch: EngineCanvas `f62ddfd`; React/JSX `9d61539`.
- Local type-check, production build, and website preview were not run in this connector-only session. Recheck CI and required repository checks before merging.

## Additional documentation pass — 2026-11-03
- Corrected the Gen 2 `useEngineCanvas()` example: removed an undeclared `finished` identifier and replaced it with a type-narrowed WebGL 2D-independent clear operation that returns `false` after one frame. The main EngineCanvas and React/JSX examples also show the Client Component boundary and guard the callback's Canvas2D/WebGL/WebGL2 union.
- Container tools available: Git 2.47.3, Node.js 22.16.0 and npm 10.9.2. Direct GitHub access failed at DNS resolution (`Could not resolve host: github.com`); no local clone/download or local type-check/build was performed.
- Changes were committed through the connected GitHub integration to the existing documentation PR branch.

## Extended component/API audit — 2026-11-03
- Added source-matched EngineForms input/textarea/checkbox prop tables and clarified the EngineProvider handler-string contract versus ordinary React form callbacks.
- Added EngineLink prop contracts, the EngineNavLogo shape and the exported renderEngineAnchor(cfg): ReactElement helper.
- Expanded EngineImage/EngineVideo props with the Gen 2 implementation's actual observer/default behavior and added a standalone EngineVideo prop table.
- Added Overlay overlayStyle, direct React action callback semantics and a warning not to nest interactive controls inside Gen 2's generated trigger button.
- Documented the explicit EngineTransitionLink Gen 2 prop set rather than implying it inherits all Next.js Link props.
- Expanded CustomSelect's direct React contract with controlled value, callback overload, accessible name, search placeholder and empty-state label; retained the Gen 2 No options found default.
- Structural validation on the changed module pages found balanced Markdown code fences and no duplicate real section headings after correcting the accidental joined headings.
- No local type-check, production build, or docs-site preview was run because the container cannot resolve GitHub DNS. The current PR workflow checks must pass before merging.

## Animation, Canvas, SVG and primitive follow-up — 2026-11-03
- Expanded EngineManim with exact 2D/3D configuration tables, shape/timeline contracts and direct React component prop signatures. The direct React example is now a self-contained Client Component.
- Documented the Generation 2 Manim3D boundary: `Manim3DConfig` has no `materialSrc` and no special `$root` bone target; use named bones.
- Confirmed the Gen 2 EngineCanvas runtime still supports measured adaptive DPR: `adaptive` defaults to true and `adaptiveTargetFps` controls the target cadence for DPR recovery/degradation.
- Clarified that `engine: "skia"` is registered but currently throws because its CanvasKit backend is a stub; use `2d` or `3d` for a working renderer.
- Added EngineSVG public helper signatures (`exportSVG(scene, width, height): string`, browser-only `importSVG(svgSource): ECNode[]`) and documented the exported `ECRenderingEngine` contract.
- Expanded primitives common-prop coverage, corrected the Button `type` contract and EngineLink schema callback type, added Box axis gaps, and documented direct EngineCard `coverClassName`.
- Structural validation covered the Gen 2 primitives, Canvas, Manim and SVG pages plus shared Shader references: all scanned pages had balanced code fences and unique actual headings.
- Local clone/build/type-check/site preview remain unavailable because outbound DNS to GitHub is blocked in the container. The GitHub connector remains the only repository editing/inspection path used.
