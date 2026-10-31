# Evidence Ledger — Generation 3

| Claim | Source | Status | Consequence |
|---|---|---|---|
| Root API contract is the named export set from `src/engine/index.ts`. | `src/engine/index.ts` | Verified | Exact names listed in API export inventory. |
| Server-only functions are separated by `src/engine/server.ts`. | `src/engine/server.ts` | Verified | Keep request/server APIs out of client bundle. |
| Client NENC and EngineCookies helpers are exported from `src/engine/network.ts`. | `src/engine/network.ts` | Verified | Client network docs use `nextjs-engine/network`. |
| SEO image response helper is exported from `src/engine/seo.ts`. | `src/engine/seo.ts` | Verified | Document helper as a server route integration. |
| `ensureAPIConfig()` loads `.EngineAPIConfig/*.api` when no injected compiled config is available. | `src/engine/core/EngineAPIConfigParser.ts` | Verified | Do not describe plugin JSON output as its direct input. |
| EngineAPIResolver dispatches static endpoint descriptors into APIStatic. | `src/engine/core/EngineAPIResolver.ts` | Verified | Document the resolver/APIStatic composition. |
| APIStatic executes browser-loaded route modules from a manifest. | `src/engine/core/APIStatic.ts` | Verified | Route programs are public and must not contain secrets. |
| NENC plugin emits client/server manifests and a route. | `src/engine/plugins/nencPlugin.js` | Verified | Describe generated artifacts as build output. |
| EngineServer uses Next.js request APIs. | `src/engine/core/EngineServer.ts` | Verified | Server-only import path is required. |
| EngineCookies uses AES-256-GCM and verifies optional device proof/trust binding. | `src/engine/core/enginecookies/EngineCookieVault.ts`, `EngineDeviceKey.ts` | Verified | Avoid implying it is a browser cookie helper. |
| EngineTheme remote artifacts are declarative data; React code is not loaded from remote theme. | `src/engine/component/engineTheme/*` | Verified | Keep custom components local/trusted. |
| Scheduler coordinates eligible work and frame pressure. | `src/engine/core/enginescheduler/EngineScheduler.ts` | Verified | Do not promise fixed scheduling latency or resolution reduction. |
| EngineSEO compiles Next.js metadata, sitemap, robots and JSON-LD. | `src/engine/core/engineseo/EngineSEO.ts` | Verified | Use builder/compiler terms in public docs. |

No credentials, environment values or private user data are stored in this ledger.
