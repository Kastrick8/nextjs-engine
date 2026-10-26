# Generation 3 Documentation

> **Generation:** 3.x alpha · **Source branch:** `main-3`  
> **Status:** Pre-release; this is not the stable Gen 2 API contract.

This is the curated starting point for the current Gen 3 implementation. Canonical Gen 3 component references live under docs/3/engine-components/. The older docs/engine-components/ paths are retained as compatibility copies for existing links; new repository navigation should use the versioned paths.

## Choose the level of detail

| Need | Guide |
|---|---|
| Get started with the current API | [Developer reference](./readme.md) |
| Use styling props | [Styling — simple](./styling.md) |
| Understand style compilation and collection | [Styling — detailed](./styling-detailed.md) |
| Understand compiler/runtime internals, artifact caching, build budgets, and security checks | [Compiler deep dive](./compiler-deep-dive.md) |
| Understand the compiler and server-first rendering model | [Gen 3 overview](../gen3/overview.md) |
| Browse the complete versioned component catalog | [Component reference](./engine-components/index.md) |

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

These component references describe the implementation on `main-3`. Canonical guides live under `docs/3/engine-components/`; copies under `docs/engine-components/` remain only for compatibility with older links.

| Component / system | Guide |
|---|---|
| Primitives, layouts, slots, custom nodes | [Primitives](./engine-components/primitives.md) |
| Canvas, retained graphics, SVG, and rendering engines | [EngineCanvas](./engine-components/enginecanvas.md) |
| Retained Three.js 3D rendering | [Engine3D](./engine-components/engine3d.md) |
| SVG import/export | [EngineSVG](./engine-components/enginesvg.md) |
| GPU effects and `.shed` programs | [EngineShader](./engine-components/engineshader.md) |
| Page/layout transitions and shared morphs | [EngineTransitions+](./engine-components/enginetransitions.md) |
| Scroll points, timelines, snapping, and behavior policy | [EngineScroll](./engine-components/enginescroll.md) |
| Explicit scroll interval geometry | [EngineScroll Range](./engine-components/enginescroll-range.md) |
| Scroll-driven timelines | [EngineScroll Timeline](./engine-components/enginescroll-timeline.md) |
| Coordinate multiple timelines | [EngineScroll Director](./engine-components/enginescroll-director.md) |
| Track named point positions | [EngineScroll Point Tracker](./engine-components/enginescroll-tracker.md) |
| Focus and visibility behavior | [EngineScroll Focus](./engine-components/enginescroll-focus.md) |
| Named point groups | [EngineScroll Groups](./engine-components/enginescroll-groups.md) |
| Browser capabilities and interactions | [EngineBrowser](./engine-components/enginebrowser.md) |
| 2D/3D animation | [EngineManim](./engine-components/enginemanim.md) |
| Image loading and media controls | [EngineImage](./engine-components/engineimage.md) |
| Video lazy activation and viewport lifecycle | [EngineVideo](./engine-components/enginevideo.md) |
| Reusable themes, .etr artifacts, Markdown templates, fonts and Data-API | [EngineTheme](./engine-components/enginetheme.md) |
| Server-first Markdown and URL icons | [EngineMarkdown](./engine-components/enginemarkdown.md) |
| Navigation | [EngineNav](./engine-components/enginenav.md) |
| Individual transition-aware links | [EngineLink](./engine-components/enginelink.md) |
| Device information and adaptive schema patches | [EngineMobile / EngineDevice](./engine-components/enginemobile.md) |
| Hero layouts and parallax | [EngineHero](./engine-components/enginehero.md) |
| Forms | [EngineForms](./engine-components/engineforms.md) |
| Searchable styled select | [CustomSelect](./engine-components/customselect.md) |
| Suspense/loading surfaces | [EngineSuspense](./engine-components/enginesuspense.md) |
| Dialog, drawer, popover | [EngineOverlay](./engine-components/engineoverlay.md) |
| EngineTransitions+ edge cases and compatibility | [Transition compatibility](./engine-components/enginetransitions-compatibility.md) |
| Mobile layout/scroll interaction edge cases | [Mobile scroll stability](./engine-components/mobile-scroll-stability.md) |
| External API resolution/configuration | [EngineAPIResolver](./engine-components/engineapi.md) |
| Browser-side endpoint programs | [APIStatic](./engine-components/apistatic.md) |
| Metadata, sitemap, robots, JSON-LD, social previews | [EngineSEO](./engine-components/engineseo.md) |
| Search-engine-specific XML sitemaps | [Provider sitemaps](./engine-components/engineseo-provider-sitemaps.md) |

## Release and compatibility

- [Generation 3 alpha candidate notes](../release/NE-v3-0-0-alpha-1.md)
- [All release history](../release/index.md)
- [Main documentation index](../index.md)
- [Generation 2 stable 2.x docs](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/index.md)

The Generation 3 compiler creates an Engine execution plan; it does not replace Next.js's own compiler/build system. Keep Gen 2 and Gen 3 APIs separate when implementing or migrating features.
