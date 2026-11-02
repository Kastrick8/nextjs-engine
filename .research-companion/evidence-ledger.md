# Evidence Ledger — Generation 2

| Claim | Source | Status | Consequence |
|---|---|---|---|
| Public contract is the named exports from the root barrel. | `src/engine/index.ts` | Verified | Complete names listed in API exports page. |
| Server entrypoint only exposes device helpers/types. | `src/engine/server.ts` | Verified | Do not document Gen 3 EngineServer/CORS/NENC here. |
| `ensureAPIConfig()` loads `.EngineAPIConfig/*.api` when no injected config exists. | `src/engine/core/EngineAPIConfigParser.ts` | Verified | JSON plugin output is a separate build artifact. |
| Gen 2 normal HTTP request bodies use `formData`. | `src/engine/core/EngineAPIResolver.ts` | Verified | Use formData in ordinary HTTP examples. |
| For a static descriptor, APIResolver forwards `input` to APIStatic and falls back to formData. | `src/engine/core/EngineAPIResolver.ts` | Verified | Explain the special input case separately. |
| APIStatic loads hashed browser modules through a manifest. | `src/engine/core/APIStatic.ts` | Verified | Route files are public browser code. |
| Gen 2 Engine plugin composes API and shader plugins. | `src/engine/plugins/enginePlugin.js` | Verified | Exclude Gen 3 plugin options. |
| Gen 2 page rendering is provider/schema renderer based. | `src/engine/createPage.tsx`, `src/engine/core/SchemaRenderer.tsx` | Verified | Do not claim server-first compiler behavior. |

| EngineAPIResolver auth modes are `none`, `ak`, `bearer`, `jwt`, `basic`, `hmac`, and `pnp`; they authenticate the outgoing provider request. | `src/engine/core/EngineAPIResolver.ts`, `src/engine/core/EngineAPIConfigParser.ts`, `src/engine/schema/types.ts` | Verified | Document credential requirements and distinguish upstream request authentication from user/account authorization. |
| APIStatic compiles browser-loaded route modules and exposes schema validation/proxy execution, not a built-in account session or authorization engine. | `src/engine/core/APIStatic.ts` | Verified | Treat route code/input as public; put account/tenant/permission checks in an application-owned server endpoint. |
| EngineAPIResolver dispatches static endpoint descriptors before building the ordinary HTTP request/auth headers. | `src/engine/core/EngineAPIResolver.ts` | Verified | A resolver auth mode does not secure an APIStatic descriptor. |
| The `APIStaticOptions.proxy` callback defaults to an unconfigured handler. | `src/engine/core/APIStatic.ts` | Verified | Describe proxy as an integration hook, not a security policy. |
| Gen 2 has no NENC command/session/permission APIs. | `src/engine/server.ts`, `src/engine/index.ts` | Verified | Private operations use application-owned Route Handlers/backends in Gen 2. |
| EngineProvider exposes context but collected-style emission is performed by the internal `EngineCollectedStyles` helper within factory-rendered trees. | `src/engine/providers/EngineProvider.tsx`, `src/engine/createPage.tsx` | Verified | Warn against treating EngineProvider alone as the full SSR style integration. |
| Gen 2 schema-backed `createComponent()` returns a regular React component and wraps Engine context/style collection. | `src/engine/createPage.tsx` | Verified | Document JSX composition without requiring an all-schema app. |

| APIStaticOptions/APIStaticOperation define route execution, input and proxy contracts but no auth/session/role/permission fields. | `src/engine/core/APIStatic.ts` and APIStatic public types | Verified | Explicitly distinguish input validation/proxy integration from account authentication/authorization. |
| Gen 2 `nextjs-engine/server` exposes only device helpers/types and has no EngineServerSession, EngineCookies vault or NENC session policy. | `src/engine/server.ts` | Verified | These APIs are Gen 3-only; Gen 2 account checks remain application/backend owned. |

| LazyMount and LazySection are public client-side exports; LazyMount uses one-shot intersection mounting with a 600px default root margin, and LazySection adds `content-visibility: auto` by default. | `src/engine/components/LazyMount.tsx`, `src/engine/index.ts`, `src/engine/hooks/useInView.ts` | Verified | Document the real Gen 2 props/defaults and the client/browser boundary; avoid pointing to missing grouped pages. |

No secrets, environment values or private user data are stored.
