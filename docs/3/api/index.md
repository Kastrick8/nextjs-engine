# Public API Reference — Generation 3

This section describes imports intended for application and integration code. **Every package export is listed in the [complete public export inventory](./exports.md)**; the topic pages explain the contracts and how APIs work together.

## Entry points

| Import | Use it for |
|---|---|
| `nextjs-engine` | Page/component factories, components, hooks, schema types, themes, SEO, compiler/compatibility APIs and shared runtimes |
| `nextjs-engine/server` | Next.js request/session context, device detection, CORS and server-owned NENC dispatch |
| `nextjs-engine/network` | Client-side EngineCommand/NENC transport, device proof and EngineCookies APIs |
| `nextjs-engine/seo` | Server-side Open Graph image response helper and SEO exports |

## Read by API family

| Topic | Reference |
|---|---|
| All exact exported names and types | [Complete export inventory](./exports.md) |
| How public API families connect | [API relationships and lifecycle](./relationships.md) |
| Page, component, schema and theme factories | [Create API family](./create.md) |
| Component registration and scoped registries | [Component Registry](./component-registry.md) |
| Schema contracts and validation | [Schema API](./schema.md) |
| Hooks and provider context | [Hooks API](./hooks.md) |
| EngineAPIResolver and APIStatic | [Networking APIs](./networking.md) |
| Server entrypoint | [Server API](./server.md) |
| NENC and EngineCookies client/server split | [Network API](./network.md) |
| Compiler and artifact APIs | [Compiler API](./compiler.md) |
| EngineTheme public runtime | [Theme API](./theme.md) |
| Metadata, sitemap and JSON-LD | [SEO API](./seo.md) |

## Public versus internal

A type or class being exported from a file under `src/engine/core/` does not make it public. Only symbols re-exported through one of the package entrypoints above are part of the package contract. Internal compiler stages, adapters, route builders, schedulers and debug implementation helpers are described in [NE internals](../ne/index.md), not listed as application APIs unless they are also re-exported publicly.
