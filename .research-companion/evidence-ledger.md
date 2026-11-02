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

| APIStaticOptions/APIStaticOperation define no authentication/session/role/permission contract. | `src/engine/core/APIStatic.ts` | Verified | Static route schemas validate caller input, not account identity or authorization. |
| EngineServerSession exposes read-only request cookie/header access and device/fetch/navigation helpers; it does not validate an account session or create a principal. | `src/engine/core/EngineServer.ts` | Verified | Cookie presence alone is not proof of authentication; validate with an identity provider/NENC policy. |
| EngineCookieVault seals credentials with AES-256-GCM and applies owner/origin, command, expiry, trust-list and optional device/environment binding checks. | `src/engine/core/enginecookies/EngineCookieVault.ts`, `EngineCookies.ts`, `EngineTrustList.ts`, `types.ts` | Verified | This authorizes access to credential-vault entries; it is not a general end-user login/session/role framework. |
| EngineCookieMemoryStore is the default record store and is process-local. | `src/engine/core/enginecookies/EngineCookieVault.ts` | Verified | Use persistent/shared storage for production durability and multi-instance use. |

| NE-CLI chained commands are parsed into argv and spawned with `shell:false`; shell metacharacters/expansions are rejected and output capture is bounded. | `bin/ne-cli/cli.js` | Verified | Document `--and` as executable-plus-arguments, not a shell command runner. |
| NE-CLI cleanup uses a bounded project-relative target list, rejects paths outside the project, and preserves rollback backup history. | `bin/ne-cli/project.js` | Verified | Document `ne clean` as constrained cleanup, not arbitrary recursive deletion. |
| NE-CLI update/rollback snapshots dependency files in private temporary directories and writes managed state atomically. | `bin/ne-cli/project.js`, `bin/ne-cli/file-system.js` | Verified | Explain confirmation, rollback and managed state safety. |
| NE-CLI task worker pool is capped at three workers; build invokes optional production preparation, checks, then Next build on the main thread. | `bin/ne-cli/tasks.js`, `bin/ne-cli/project.js` | Verified | Document observed task order and concurrency cap without implying arbitrary parallel Next builds. |
| NE-CLI release channels distinguish Stable npm, verified Alpha artifacts, verified Beta artifacts and Latest Green (stable/beta only); tag-only entries are not installable. | `bin/ne-cli/channels.js`, `bin/ne-cli/cli.js` | Verified | Describe channel source/verification rules and catalog-only tags. |

| EngineTrustList normalizes exact HTTP(S) origins; wildcard origin rules may grant CORS only and cannot grant cookie or command access. | `src/engine/core/enginecookies/EngineTrustList.ts` | Verified | Document exact-origin trust for privileged credential-vault/command access. |
| EngineCookieVault validates device binding registrations and requires device proof for every non-`none` mode; environment-bound modes require a matching environment hash. | `src/engine/core/enginecookies/EngineCookieVault.ts`, `EngineCookies.ts`, `types.ts` | Verified | Describe device/environment binding as opt-in vault-entry protection, not user login. |
| EngineCookieVault generates a non-exportable AES-GCM 256-bit key by default; a supplied key must be non-exportable AES-GCM with encrypt/decrypt usages. | `src/engine/core/enginecookies/EngineCookieVault.ts` | Verified | Distinguish generated default key from caller-supplied key requirements. |

No credentials, environment values or private user data are stored in this ledger.
