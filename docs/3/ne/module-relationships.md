# Generation 3 Module Relationships

This map describes how the major Engine subsystems depend on each other. Arrows indicate the common implementation/use direction; they are not a promise that every page executes every subsystem.

## Page/render pipeline

~~~text
PageSchema + EngineConfig
          │
          ▼
createPage() / defineSchema()
          │
          ▼
schema validation + component registry
          │
          ▼
compilePage()
  ├─ feature-use manifest
  ├─ adaptive device schema
  ├─ fallback/security diagnostics
  ├─ artifact graph and budgets
  └─ server/client ownership plan
          │
          ▼
EngineServerRenderer
          │
          ├── server-renderable component output
          └── client islands for browser-owned interaction
                     │
                     ▼
             EngineProvider / StyleCollector
                     │
                     ▼
      EngineScheduler + EngineModel + EngineViewport
                     │
                     ▼
          feature modules / React hooks
~~~

## Runtime dependency map

| Public feature | Supporting implementation | Main relationships |
|---|---|---|
| EngineTheme | `component/engineTheme/`, theme compiler and theme registry | Page schema, built-in component registry, style compiler, Markdown highlighter, templates and fonts |
| EngineScroll | `core/enginescroll/` | EngineProvider, browser event scheduler, points, navigator, ranges, timeline, director and tracker |
| EngineCanvas | `core/enginecanvas/` | Scene graph, renderer registry, frame clock, provider and EngineScheduler |
| EngineShader | `core/engineshader/`, shader plugin/compiler | Compiled manifest, renderer surface, scroll/viewport and EngineScheduler |
| EngineManim | `components/EngineManim/` | DSL parser, animation config compiler, easing and 3D animation routing; Generation 3 also uses EngineScheduler |
| EngineOverlay | `components/EngineOverlay/`, `core/engineoverlay/` | Dialog/Drawer/Popover, stack ownership, portal, focus restoration, scroll lock and EngineTheme slots |
| EngineTransitions+ | `core/enginetransitions/` | Presets, native View Transition coordinator, reduced-motion and router integration |
| EngineBrowser | `core/EngineBrowser.ts` + safe entry wrapper | Browser feature, clipboard/media/speech/network access and useBrowser() |
| EngineDevice/Mobile | `core/EngineDeviceShared.ts`, DeviceServer, MobilePatcher | User-agent detection, request context and adaptive schema inputs |
| EngineSEO | `core/engineseo/` + SEO plugin | PageSchema/PageMeta → metadata/robots/sitemap/JSON-LD; plugin scans routes |
| EngineAPIResolver/APIStatic | `core/EngineAPIResolver.ts`, `APIStatic.ts`, API plugin/compiler | Provider config → resolver; resolver may dispatch to a browser static endpoint |
| NENC | `core/nenc/`, NENC plugin/compiler | Command declarations → manifest → client transport → server dispatcher → handler |
| EngineCookies | `core/enginecookies/` | Encrypted records, metadata index, trust policy and optional device proof |
| EngineModel | `core/EngineModel.ts` and model hooks | Shared state/subscriptions for consumers and development inspection |
| EngineViewport | `core/EngineViewport.ts` and viewport hook | Shared layout/visual viewport snapshot consumed by viewport-aware features |
| EngineScheduler | `core/enginescheduler/` and scheduler hooks | Visibility, near-viewport, frame pressure and deferred work classes |

## Build plugin composition

The Generation 3 `withEngine()` plugin composes the API compiler, optional NENC, EngineDebug, EngineSEO, shader compilation, error handling, Turbopack cache defaults, image quality config and the Next.js build adapter. Plugin submodules are not the same thing as public APIs: consumers should configure them through the supported `withEngine(nextConfig, options)` entrypoint documented in [Next.js integration](../integrations/nextjs.md).

## Boundaries that matter

- Server-only modules are reached through `nextjs-engine/server`.
- Browser command and cookie helpers are reached through `nextjs-engine/network`.
- APIStatic route programs are downloadable browser modules.
- Remote EngineTheme files are declarative JSON data, not executable components.
- Internal registry, compiler and plugin helpers are private unless explicitly re-exported.
