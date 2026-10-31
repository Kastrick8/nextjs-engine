# Architecture Notes — Generation 3

## Page/rendering lifecycle
```text
PageSchema / EngineConfig
  → createPage()
  → validation + registry resolution
  → compilePage()
  → server-first ownership plan
  → EngineServerRenderer
  → client islands as required
  → EngineProvider / StyleCollector
  → feature modules and hooks
```

## Cross-module dependency groups
| Group | Relationship |
|---|---|
| Page/factories | createPage selects renderer; registry resolves schema node type; provider supplies page context/handlers/slots/styles |
| Theme/style | createTheme → theme resolver → built-in/custom component styles → StyleCollector |
| Browser/runtime | EngineViewport publishes view geometry; EngineScheduler coordinates eligible work; image/video/canvas/shader/scroll/animation consume their relevant signals |
| Scroll | provider + global EngineScroll runtime; points/nav/movement/hash/snap/range/timeline/director/tracker are cooperating subsystems |
| Graphics | model factories → renderer registry → Engine2D/3D/SVG/Skia; EngineCanvas owns React lifecycle and frame clock |
| Networking | .api provider config → EngineAPIResolver; EngineAPIResolver may delegate to APIStatic static route descriptor |
| NENC | command declaration → build manifest → client transport → generated route/server dispatcher → auth/device proof/rate/replay policy → application handler |
| EngineCookies | alias/index metadata + sealed encrypted record store + trust/device proof policy |
| SEO | schema/builder → metadata/robots/sitemap/JSON-LD; SEO plugin discovers route sources; seo entrypoint renders social image |
| Error handling | runtime/build reporter → error book lookup; diagnostics are not HTTP error responses |

## Source paths
- Compiler: `src/engine/compiler/`
- Components: `src/engine/components/`
- Shared core: `src/engine/core/`
- EngineTheme runtime: `src/engine/component/engineTheme/`
- Hooks/providers: `src/engine/hooks/`, `src/engine/providers/`
- Build plugins: `src/engine/plugins/`
- EngineDebug: `src/engine/debug/`
- CLI: `bin/ne.js`, `bin/ne-cli/`

## Public/internal boundary
The root barrel and server/network/seo entrypoints are the public contract. Private files may export functions for internal composition and tests; those names must not be advertised as consumer imports unless re-exported by a package entrypoint.
