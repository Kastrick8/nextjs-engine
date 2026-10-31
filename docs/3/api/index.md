# Public API Reference

This section is the canonical reference for public exports from `nextjs-engine` and its server-only entrypoint. Module guides explain behavior and patterns; these pages own API signatures and public contracts.

| Reference | Contents |
|---|---|
| [Create family](./create.md) | `createPage()`, `createComponent()`, `createTheme()`, `defineSchema()` |
| [Component registry](./component-registry.md) | Built-in registry, custom registrations and scoped registries |
| [Schema types](./schema.md) | PageSchema, SchemaNode, PageMeta, EngineConfig and component prop types |
| [Hooks](./hooks.md) | Provider, viewport, scheduler, model, scroll, browser and visibility hooks |
| [Server API](./server.md) | Server-only EngineServer, device, CORS and NENC exports |

## API ownership

- A factory signature belongs here, even when it creates a module documented elsewhere.
- Component props and feature behavior belong in the module guide.
- Internal compiler classes and plugin implementation details belong in [NE](../ne/index.md).
- Configuration files and environment variables belong in [Configuration](../configuration/index.md).

Only exports available on the current Generation 3 branch are described here.
