# NE Architecture

Generation 3 separates schema authoring, compilation, server rendering and browser-owned interaction. The exact path depends on schema eligibility and the features required by a page.

```text
PageSchema
   │
   ▼
createPage()
   │
   ▼
compilePage()
   ├── node/runtime ownership
   ├── work classes and feature manifest
   ├── asset graph and diagnostics
   └── browser fallback plan
   │
   ▼
EngineServerRenderer
   │
   ▼
server-rendered output + client islands where required
   │
   ▼
EngineProvider / scheduler / model / viewport
```

## Main boundaries

| Boundary | Responsibility |
|---|---|
| Public API | Page, component, schema, theme and registry authoring |
| Compiler | Analyze schema, assign work/ownership, discover assets and diagnostics |
| Server renderer | Render server-owned content and preserve the intended client boundary |
| Component registry | Resolve schema node IDs to built-ins or trusted custom components |
| Runtime | Coordinate state, visibility, scheduling, scroll and browser work |
| Plugins | Integrate Engine compilation and support systems with Next.js |
| Server entrypoint | Expose request-aware helpers without pulling them into client bundles |

## Repository source map

| Source area | Role |
|---|---|
| `src/engine/createPage.tsx` | Page and component factories |
| `src/engine/compiler/` | Compiler pipeline and artifact planning |
| `src/engine/core/` | Runtime engines and infrastructure |
| `src/engine/components/` | UI component implementations |
| `src/engine/component/engineTheme/` | EngineTheme runtime |
| `src/engine/plugins/` | Next.js/build plugin integration |
| `src/engine/debug/` | EngineDebug implementation |
| `src/engine/server.ts` | Server-only export surface |
| `bin/ne.js`, `bin/ne-cli/` | NE-CLI entrypoint and command implementation |

## Important behavior boundaries

- Server-first rendering is the default for eligible Generation 3 pages, not a guarantee for every arbitrary component tree.
- Client islands are introduced where browser interaction or a client-only capability is required.
- Named page handlers currently select the compatibility/provider rendering path.
- A scoped component registry requires the server-first path.
- Request-aware and filesystem-aware helpers belong on the server/build side.

See [Compiler](./compiler/index.md), [Runtime](./runtime.md) and [Server API](../api/server.md).
