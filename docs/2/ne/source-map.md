# Generation 2 Source Map

Internal architecture map for `main-2`, not a set of public import paths. The package contract is defined by `src/engine/index.ts` and `src/engine/server.ts`.

| Path | Responsibility | Public API? |
|---|---|---|
| `src/engine/index.ts` | Root export barrel | Yes |
| `src/engine/server.ts` | Server-only device entrypoint | Yes |
| `src/engine/createPage.tsx` | Factories | Selected exports |
| `src/engine/schema/` | Schema contracts and prop types | Only re-exported types |
| `src/engine/components/` | React components/primitives | Only re-exported components |
| `src/engine/core/` | Runtime systems/shared services | Only re-exported values |
| `src/engine/hooks/` | React hooks | Only re-exported hooks |
| `src/engine/providers/` | Provider context/styles | Selected public APIs |
| `src/engine/plugins/` | API/shader build integration | Internal integration |
| `bin/ne.js`, `bin/ne-cli/` | CLI executable/commands | CLI, not JS API |
| `scripts/`, `tests/browser/` | Smoke and browser tests | Not app APIs |
| `app/`, `examples/` | Repository fixtures | Not package APIs |

SchemaRenderer resolves schema node types through the global registry. EngineProvider supplies config, handlers, slots, breakpoint context and style collection. EngineScrollProvider supplies scroll state. StyleCollector emits collected styles. API plugins compile provider files and APIStatic route programs. A private helper's `export` modifier does not make it a supported package import.
