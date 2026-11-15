# Public API Inventory — Generation 3

## Entry-point list
- Root shared entrypoint: `src/engine/index.ts` → package import `nextjs-engine`.
- Server-only entrypoint: `src/engine/server.ts` → `nextjs-engine/server`.
- Client/network entrypoint: `src/engine/network.ts` → `nextjs-engine/network`.
- SEO route helper: `src/engine/seo.ts` → `nextjs-engine/seo`.

The full exact names, including exported type-only declarations and aliases, are in [docs/3/api/exports.md](../docs/3/api/exports.md).

## Public API families
- Factories: `createPage`, `createComponent`, `defineSchema`, `createTheme`.
- Registry: global register/get/has/unregister APIs plus Generation 3 scoped `EngineComponentRegistry`.
- Components: primitives, navigation, image/video, markdown, hero, forms/select, suspense, overlay, canvas/shader and Manim.
- Shared runtimes: EngineScroll, EngineTransitions+, EngineScheduler, EngineModel, EngineViewport and browser/device.
- Advanced compiler: compilePage, feature/fallback plan, artifact, runtime profile, budget and security diagnostic APIs.
- EngineTheme: create/parse, remote loading, data handlers, templates and highlighter providers.
- Networking: EngineAPIResolver, APIStatic, config-parser helpers.
- SEO: EngineSEO builder, Metadata/robots/sitemap/JSON-LD compiler, JSON-LD component and image-response entrypoint.
- Server: EngineServer, device, CORS and NENC dispatch/authentication/security/replay helpers.
- Network client: EngineCommand, NENC transport, EngineCookies, EngineDeviceKey and device proof helpers.
- Diagnostics: schema validation/analyzer and Engine error report functions.

## Import-boundary rules
- Do not import server-only code into a client module.
- Do not place secrets in APIStatic `.route` code.
- Do not treat internal plugin/compiler implementation exports as public unless they appear in a package entrypoint.
- Do not equate EngineCookies with a general-purpose browser cookie wrapper; it is a sealed server-owned data and trust system.
- Treat EngineScheduler/Model/Viewport as Generation 3 only.
