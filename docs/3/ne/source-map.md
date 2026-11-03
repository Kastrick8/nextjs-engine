# Generation 3 Source Map

This page describes the implementation layout on `main-3`. It is an internal architecture guide, not a list of public import paths. The public surface is defined by the package entrypoints and catalogued in [API → Exports](../api/exports.md).

## Repository-wide source areas

| Path | Responsibility | Public API? |
|---|---|---|
| `src/engine/index.ts` | Root public export barrel | Yes |
| `src/engine/server.ts` | Server-only public export barrel | Yes |
| `src/engine/network.ts` | Client/network public export barrel | Yes |
| `src/engine/seo.ts` | SEO image helper entrypoint and SEO star barrel | Yes |
| `src/engine/createPage.tsx` | Page/component/schema factories and renderer selection | Selected exports are public |
| `src/engine/schema/` | Schema contracts, feature prop types and schema helpers | Types are public only when re-exported |
| `src/engine/components/` | React components and UI composition | Components/props are public only when re-exported |
| `src/engine/core/` | Runtime systems and shared services | Selected APIs are public only when re-exported |
| `src/engine/component/engineTheme/` | EngineTheme runtime, resolver, tokens, templates, data and highlighting | Selected APIs are public only when re-exported |
| `src/engine/compiler/` | Server-first compiler, execution plans, fallback, artifact graph and budgets | Selected compiler API is public |
| `src/engine/debug/` | EngineDebug workbench, inspectors, route and source tooling | Internal/development tooling |
| `src/engine/hooks/` | React hooks connecting runtime features to components | Selected hooks are public |
| `src/engine/providers/` | EngineProvider context and style collection | Selected provider APIs are public |
| `src/engine/plugins/` | Next.js build/config plugins and generated routes | Internal integration layer |
| `src/engine/errors/` | Error-reporting implementation and report types | Selected report API is public |
| `bin/ne.js`, `bin/ne-cli/` | NE-CLI executable and command implementation | CLI is public as a command, not a JS library barrel |
| `scripts/` | Smoke tests and CI proof scripts | No application API |
| `tests/browser/` | Browser behavior contracts | Tests, not public API |
| `examples/` | Demonstration projects | Examples, not public API |

## Important internal subsystems

### Compiler
`src/engine/compiler/` composes schema analysis, adaptive schema compilation, used-feature manifest generation, fallback planning, security diagnostics, style compilation, artifact graph/fingerprints, build budgets and server rendering.

### Core runtimes
`src/engine/core/` contains EngineAPIResolver/APIStatic, browser/device helpers, EngineModel, EngineViewport, EngineScheduler, EngineScroll, EngineCanvas, EngineShader, transitions, overlays, cookies, NENC, SEO and shared registries. Public entrypoint re-exports are a strict subset of the implementation exports.

### Component implementations
`src/engine/components/` contains primitive and domain UI components. Multi-file groups such as EngineOverlay, EngineManim and EngineTheme are documented by cohesive feature contract rather than one page per source file.

### Plugins and build outputs
`src/engine/plugins/` composes with Next.js and writes generated API, NENC, SEO, shader and debug artifacts. Generated outputs such as `.nextjs-engine/nenc/client.ts` and `server.ts` are project build artifacts; do not edit them directly.

## Scope rule

When a source symbol is referenced in a module page, confirm whether its import path is public. If not, describe the behavior as internal architecture and link to the owning public abstraction rather than teaching consumers to import a private file.
