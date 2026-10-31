# Public API Inventory — Generation 2

## Entry points
- Root: `src/engine/index.ts` → `nextjs-engine`.
- Server: `src/engine/server.ts` → `nextjs-engine/server`.

Every exact named value and type re-export is listed in [docs/2/api/exports.md](../docs/2/api/exports.md).

## Public families
- Factories: `createPage`, `createComponent`, `defineSchema`.
- Global registry: register/unregister/get/has/list component APIs.
- Schema: PageSchema/SchemaNode/EngineConfig and component props; validation and analyzer functions.
- UI: primitives, link/nav, transitions, Manim/Manim3D, image/video/canvas/shader/markdown/hero, lazy mount, select, suspense, forms and overlays.
- Runtimes: graphics factories/renderers, EngineScroll points/ranges/timelines/director/tracker, shader loader and transition runner.
- Browser/device: EngineBrowser/useBrowser, detectDevice/useMobileDevice, in-view and provider hooks.
- Networking: EngineAPIResolver, APIStatic and provider parser APIs.
- Server: getServerDevice, detectDevice, DESKTOP_DEVICE and shared device types.
- CLI: `ne` is a package executable, not a root JavaScript export.

## Import boundaries
Gen 2 has no EngineTheme `createTheme()`, compiler-first APIs, scoped component registry, EngineSEO, EngineDebug, NENC, EngineCookies, EngineCORS, EngineScheduler, EngineModel, EngineViewport or separate network/SEO entrypoints.
