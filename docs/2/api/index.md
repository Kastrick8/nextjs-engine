# Public API Reference — Generation 2

The [complete export inventory](./exports.md) lists every value and type re-exported by the Generation 2 package entrypoints.

| Entry point | Purpose |
|---|---|
| `nextjs-engine` | Factories, components, hooks, schema types, feature runtimes, EngineAPIResolver and APIStatic |
| `nextjs-engine/server` | Request-aware device detection and shared device helpers |

| Topic | Reference |
|---|---|
| Exact public names and types | [Exports](./exports.md) |
| How public APIs connect | [Relationships](./relationships.md) |
| Page/schema/component factories | [Create API](./create.md) |
| Global component registry | [Component Registry](./component-registry.md) |
| Schema and component prop types | [Schema API](./schema.md) |
| Hooks/provider context | [Hooks API](./hooks.md) |
| EngineAPIResolver and APIStatic | [Networking APIs](./networking.md) |
| Server device helpers | [Server API](./server.md) |

Only symbols re-exported through `src/engine/index.ts` or `src/engine/server.ts` are supported package APIs. Private `core/`, `components/` or `plugins/` helpers are not direct public imports.
