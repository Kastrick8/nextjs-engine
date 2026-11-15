# Migrating from Generation 2 to Generation 3

> **Generation 3 · Alpha** · This guide is the migration companion to the stable 2.x reference.

Generation 2 and Generation 3 are separate API generations. Gen 2 is the stable 2.x contract; Gen 3 is a compiler-first/server-first alpha line with additional APIs and changed behavior. Do not copy Gen 3 imports or examples into a Gen 2 application and assume they exist there.

For the Gen 2 reference, see the [Gen 2 documentation index](https://github.com/Kastrick8/nextjs-engine/blob/main-2/docs/2/index.md) and its [migration notes](https://github.com/Kastrick8/nextjs-engine/blob/main-2/docs/2/migration-to-gen3.md).

## Before you migrate

- Pin the target Engine package/version and inspect its entrypoints.
- Compare the application's imports with [Gen 3 public exports](../api/exports.md).
- Keep the application’s normal React/Next.js pages and components; migrate Engine-owned surfaces incrementally.
- Review server/client boundaries, provider placement, API access, and authentication/authorization separately.
- Do not migrate an application’s user/session database or replace its identity provider just to adopt the Engine compiler.

## Generation changes at a glance

| Area | Gen 2 contract | Gen 3 contract | Action |
|---|---|---|---|
| Page renderer | Provider-backed schema renderer | Compiler-first/server-first by default when eligible | Validate compile eligibility and runtime boundaries. |
| `createPage()` | Schema page factory | Compiles a page plan; server-first unless compatibility conditions force legacy path | Review handlers, compiler options, and diagnostics. |
| `createComponent()` | Schema component factory | Schema component plus `mode: "custom"` trusted React-component adapter | Use custom mode only when the component is local/trusted and its prop contract is declared. |
| Registry | Global registry | Global compatibility registry plus scoped `EngineComponentRegistry` | Use a scoped registry when isolation is required; it requires server-first rendering. |
| EngineTheme | Theme object on page schema | Adds `createTheme()`, scopes and declarative remote theme artifacts | Migrate theme setup and review scope/remote-data rules. |
| Network/SEO imports | Root APIs and small `/server` surface | Adds `nextjs-engine/network`, `nextjs-engine/seo`, expanded `/server` APIs | Update imports and keep server-only exports on the server. |
| API config output | `.engine-api-compiled.json` | `.nextjs-engine/config/.apiconfig.json` | Update plugin options and confirm the generated artifact path. |
| Account security | Application-owned server auth for private operations | Adds optional NENC command auth/permissions and standard account-session policy | Adopt NENC deliberately; it does not create login or a session database. |
| LazyMount / LazySection | One-shot `useInView()` activation; once mounted, the subtree stays mounted | Uses `useEngineSchedule()` / EngineScheduler; near-but-not-visible work can wait under frame pressure | Component props remain similar, but activation timing/admission changes; see [LazyMount](../module/lazy-mount.md). |
| CLI | Experimental Gen 2 NE-CLI | Expanded Gen 3 NE-CLI | Review the Gen 3 CLI reference rather than assuming command parity. |

## Imports that do not exist in Gen 2

The following contracts are Gen 3 only. Using them in a Gen 2 application causes TypeScript missing-export errors or module-resolution failures:

```ts
// Gen 3 root exports, absent from Gen 2:
import { createTheme, createEngineComponentRegistry } from "nextjs-engine";

// Gen 3-only package subpaths:
import { EngineCommand } from "nextjs-engine/network";
import { createEngineSEO } from "nextjs-engine/seo";

// Gen 3-only server functions:
import {
  createNENCDispatcher,
  createNENCAccountSessionPolicy,
} from "nextjs-engine/server";
```

Gen 2's `nextjs-engine/server` only exposes device helpers and related types. It does not export the Gen 3 NENC/EngineServer/CORS API set.

## EngineAPIResolver: `input` and legacy `formData`

Gen 2 uses `resolveRequest({ formData })` as the request body for ordinary HTTP calls. Gen 3 adds `input` as the preferred body field and keeps `formData` as a compatibility fallback when `input` is `undefined`. This is a precedence change, not a removal: when both are passed in Gen 3, `input` wins.

For new JSON calls, prefer:

```ts
await resolver.resolveRequest({
  input: { accountId, filter: "active" },
});
```

For multipart uploads, use a real `FormData` body value. Do not manually set multipart `Content-Type`; the browser must add the boundary. Signed HMAC/PNP request bodies cannot use browser-generated multipart FormData.

## Configuration artifact migration

Gen 2's plugin writes `.engine-api-compiled.json`. Gen 3's canonical output is `.nextjs-engine/config/.apiconfig.json`. Gen 3 has migration diagnostics for older API config output patterns, but update the configuration deliberately and check your build output rather than relying on an implicit legacy path.

The `.EngineAPIConfig/*.api` provider source and `data/endpoint/**/*.route` APIStatic source are still distinct inputs. Do not rename one into the other.

## APIStatic is not user authentication

APIStatic remains browser-executed static JavaScript in Gen 3. Its input schema validates data shape; it does not perform account authentication or authorization. EngineAPIResolver auth modes authenticate an outbound upstream request, not the website user. For private dashboard/account operations, move the decision into a server boundary.

Gen 3 adds NENC as an optional server-side command path:
- declare `auth: "account"` and explicit `permissions` on private commands;
- enable the NENC plugin and generate the server dispatcher route;
- wire `createNENCAccountSessionPolicy()` to an application-owned session lookup;
- keep backend credentials in a server-only resolver factory;
- configure rate limits/device proof/shared replay storage according to deployment needs.

The account policy hashes and checks an existing opaque session token. It does not implement login, password verification, OAuth, sign-up, or persistent storage. See [Authentication and authorization](../integrations/authentication-and-authorization.md) and the [private-search example](https://github.com/Kastrick8/nextjs-engine/tree/main-3/examples/gen3-private-search).

## React/JSX does not need to be rewritten

Normal React/Next.js pages and third-party components remain valid. Use `createComponent()` to embed schema UI in a conventional JSX tree, `createPage()` for a complete Engine schema route, and `createComponent({ mode: "custom" })` for trusted local React components registered into a schema. See [React and JSX integration](../integrations/react-and-jsx.md).

## Migration checklist

1. Select and pin the Gen 3 package version.
2. Update imports that moved to `/network`, `/seo`, or the expanded `/server` entrypoint.
3. Review `createPage()` compiler eligibility, handler usage, and scoped registries.
4. Migrate theme creation to the Gen 3 EngineTheme contracts where needed.
5. Move new HTTP request payloads to `input`; understand the legacy `formData` fallback.
6. Update API config plugin artifact paths.
7. Keep APIStatic public; route private operations through an authenticated/authorized server boundary or NENC.
8. Run type-check, focused tests, production build, browser tests, and account-permission regression tests.

A successful TypeScript build alone does not prove that private data access or command authorization is correct.
