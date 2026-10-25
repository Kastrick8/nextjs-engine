# Generation 3 Documentation

> **Generation:** 3.x alpha · **Source branch:** `main-3`  
> **Status:** Pre-release; this is not the stable Gen 2 API contract.

This is the curated starting point for the current Gen 3 implementation. Some long-standing component guides remain at `docs/engine-components/` so existing links do not break; on `main-3`, those guides describe the Gen 3 component contract and are grouped that way by the Kastrick docs viewer.

## Choose the level of detail

| Need | Guide |
|---|---|
| Get started with the current API | [Developer reference](../readme.md) |
| Use styling props | [Styling — simple](./styling.md) |
| Understand style compilation and collection | [Styling — detailed](./styling-detailed.md) |
| Understand compiler/runtime internals, artifact caching, build budgets, and security checks | [Compiler deep dive](./compiler-deep-dive.md) |
| Understand the compiler and server-first rendering model | [Gen 3 overview](../gen3/overview.md) |

## Compiler, rendering, and runtime

| Topic | Guide |
|---|---|
| Compiler, server rendering, work classes, scheduler, EngineModel, and EngineViewport | [Compiler, rendering, and runtime](./compiler-rendering-runtime.md) |
| NENC, EngineCookies, device proof, sessions, permissions, and private backends | [Networking, credentials, and command security](./networking-credentials-security.md) |
| Used-feature manifests, browser fallbacks, EngineDebug, build budgets, and hardening | [Compatibility, EngineDebug, and hardening](./compatibility-debugging-hardening.md) |
| EngineDebug route isolation and preview behavior | [EngineDebug isolation](../gen3/engine-debug-isolation.md) |
| Server-first/client-render parity and shared style behavior | [Server-first parity](../gen3/server-first-parity.md) |
| Full device-bound login/private-search example | [Private-search example](../gen3/private-search-example.md) |
| Lazy work, observers, style collection, and bundle/runtime performance | [Runtime & performance](../runtime-performance.md) |
| Schema validation and compiler diagnostics | [Schema diagnostics](../schema-diagnostics.md) |

## Engine components

These component references describe the implementation on `main-3`. The file paths remain under `docs/engine-components/` for compatibility with existing links.

| Component / system | Guide |
|---|---|
| Primitives, layouts, slots, custom nodes | [Primitives](../engine-components/primitives.md) |
| Canvas, retained graphics, SVG, and rendering engines | [EngineCanvas](../engine-components/enginecanvas.md) |
| SVG import/export | [EngineSVG](../engine-components/enginesvg.md) |
| GPU effects and `.shed` programs | [EngineShader](../engine-components/engineshader.md) |
| Page/layout transitions and shared morphs | [EngineTransitions+](../engine-components/enginetransitions.md) |
| Scroll points, timelines, ranges, snapping, and behavior policy | [EngineScroll](../engine-components/enginescroll.md) |
| Browser capabilities and interactions | [EngineBrowser](../engine-components/enginebrowser.md) |
| 2D/3D animation | [EngineManim](../engine-components/enginemanim.md) |
| Images and video | [EngineImage / EngineVideo](../engine-components/engineimage.md) |
| Server-first Markdown and URL icons | [EngineMarkdown](../engine-components/enginemarkdown.md) |
| Navigation | [EngineNav](../engine-components/enginenav.md) |
| Device information and adaptive schema patches | [EngineMobile / EngineDevice](../engine-components/enginemobile.md) |
| Hero layouts and parallax | [EngineHero](../engine-components/enginehero.md) |
| Forms | [EngineForms](../engine-components/engineforms.md) |
| Searchable styled select | [CustomSelect](../engine-components/customselect.md) |
| Suspense/loading surfaces | [EngineSuspense](../engine-components/enginesuspense.md) |
| Dialog, drawer, popover | [EngineOverlay](../engine-components/engineoverlay.md) |
| External API resolution/configuration | [EngineAPIResolver](../engine-components/engineapi.md) |
| Browser-side endpoint programs | [APIStatic](../engine-components/apistatic.md) |
| Metadata, sitemap, robots, JSON-LD, social previews | [EngineSEO](../engine-components/engineseo.md) |
| Search-engine-specific XML sitemaps | [Provider sitemaps](../engine-components/engineseo-provider-sitemaps.md) |

## Release and compatibility

- [Generation 3 alpha candidate notes](../release/NE-v3-0-0-alpha-1.md)
- [All release history](../release/index.md)
- [Main documentation index](../index.md)
- [Generation 2 stable 2.x docs](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/index.md)

The Generation 3 compiler creates an Engine execution plan; it does not replace Next.js's own compiler/build system. Keep Gen 2 and Gen 3 APIs separate when implementing or migrating features.
