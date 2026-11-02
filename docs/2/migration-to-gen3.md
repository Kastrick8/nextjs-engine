# Migrating from Generation 2 to Generation 3

> **Generation 2 → Generation 3** · Read this before copying Gen 3 imports, config, or examples into a Gen 2 application.

Gen 2 and Gen 3 are separate API generations, not interchangeable labels for one identical runtime. Gen 2 remains the stable 2.x line. Gen 3 is a separate compiler-first/server-first alpha line. A code sample that imports successfully in Gen 3 may fail to compile or resolve in Gen 2.

For the Gen 3 implementation and full migration workflow, see the [Generation 3 migration guide](https://github.com/Kastrick8/nextjs-engine/blob/docs/comprehensive-reference-main3/docs/3/guides/migrating-from-gen2.md) and [Generation 3 index](https://github.com/Kastrick8/nextjs-engine/blob/docs/comprehensive-reference-main3/docs/3/index.md).

## High-impact differences

| Area | Generation 2 | Generation 3 | Migration consequence |
|---|---|---|---|
| Page rendering | Schema renderer with provider/client rendering | Compiler-first and server-first by default when eligible | Recheck page eligibility, server/client boundaries, and compiler diagnostics. |
| `createComponent()` | Schema-backed component factory | Schema-backed factory plus `mode: "custom"` trusted React-component adapter | Gen 3 custom-mode examples do not compile against Gen 2. |
| EngineTheme | Theme data on the page schema | Adds public `createTheme()`, scoped themes, remote declarative artifacts and handlers | Revisit theme creation and scope semantics; `createTheme` is not a Gen 2 export. |
| Component registry | Process-global registry | Global compatibility registry plus `EngineComponentRegistry` scoped instances | Scoped registry imports/types are absent in Gen 2. A Gen 3 scoped registry requires server-first rendering. |
| Server entrypoint | `nextjs-engine/server` exposes device helpers/types | Adds EngineServer, EngineCORS, NENC dispatcher/session/security APIs and more | A named import such as `createNENCDispatcher` from the Gen 2 server entrypoint fails to resolve. |
| Network/SEO entrypoints | No `nextjs-engine/network` or `nextjs-engine/seo` subpath | Adds both entrypoints | Imports from these Gen 3 subpaths fail in Gen 2. |
| User/account security | Application-owned session checks plus upstream EngineAPIResolver auth | Adds opt-in NENC command authentication/authorization and account-session policy; EngineServer adds request cookie/header access; EngineCookies adds a sealed credential vault | Gen 3's NENC features are new. EngineServer only reads request context, and EngineCookies protects vault entries; neither replaces account login/session validation. |
| API config artifact | `.engine-api-compiled.json` | `.nextjs-engine/config/.apiconfig.json` | Update plugin output/config expectations and verify migration diagnostics. |
| CLI | Newly introduced experimental Gen 2 NE-CLI | Expanded Gen 3 NE-CLI | Do not assume all CLI commands/options match. |

## Imports that will fail in Gen 2

These are Generation 3-only public contracts and are not exported by the Gen 2 entrypoints:

```ts
// These are not Gen 2 exports/subpaths:
import { createTheme, createEngineComponentRegistry } from "nextjs-engine";
import { EngineCommand } from "nextjs-engine/network";
import { createNENCDispatcher, createNENCAccountSessionPolicy } from "nextjs-engine/server";
import { createEngineSEO } from "nextjs-engine/seo";
```

TypeScript reports missing exports; runtime/bundler resolution reports a missing module for Gen 3-only subpaths. Use the Gen 2 API export inventory to verify what is available in 2.x.

## EngineAPIResolver body migration

Gen 2 uses `resolveRequest({ formData })` for ordinary HTTP request bodies. Gen 3 introduces `input` as the preferred body value for ordinary HTTP requests and APIStatic. Gen 3 still accepts `formData` as a compatibility fallback when `input` is `undefined`; it is not an automatic breaking error. When both are supplied, `input` wins.

For Gen 3 JSON request bodies, migrate to:

```ts
await resolver.resolveRequest({
  input: { accountId, filter: "active" },
});
```

For multipart uploads, pass a real `FormData` as the body input and do not set the multipart `Content-Type` manually. Keep the Gen 2 call style when targeting only Gen 2; do not assume the new input precedence exists in old versions.

## APIStatic and private dashboard operations

APIStatic is a browser-executed static route system in both generations. It validates declared inputs; it does not provide user sessions or permission authorization. EngineAPIResolver's Bearer/JWT/Basic/API-key/HMAC/PNP modes authenticate an outgoing upstream request, not the signed-in website user. Static endpoint descriptors bypass the resolver's HTTP-auth header path.

For private account/dashboard work, Gen 2 must perform session and permission checks in an application-owned server endpoint or private backend. Gen 3 can optionally use NENC with `EngineCommand.auth`, `permissions`, `createNENCDispatcher()`, and `createNENCAccountSessionPolicy()`. You still own login/session issuance and the session store. See [Gen 2 security guide](./integrations/authentication-and-authorization.md) and [Gen 3 security guide](https://github.com/Kastrick8/nextjs-engine/blob/docs/comprehensive-reference-main3/docs/3/integrations/authentication-and-authorization.md).

## Practical migration checklist

1. Choose the target generation explicitly; do not mix Gen 2 and Gen 3 entrypoints in one assumed contract.
2. Compare your imports with the target generation's [public export inventory](./api/exports.md).
3. Update the Next.js plugin options and the API config artifact location.
4. Re-evaluate `createPage()`, `createComponent()`, custom component registration, and EngineTheme use.
5. Move ordinary HTTP request bodies to Gen 3 `input` where appropriate; remember it takes precedence over legacy `formData`.
6. Keep all private credentials and account authorization checks on the server.
7. Add NENC only if you need its command transport/security model; it is opt-in.
8. Run the target branch's type-check, test suite, production build, and authentication/authorization integration tests.

Do not merge a migration based only on successful import changes. Verify runtime rendering, data boundaries, private API behavior, and user permissions.
