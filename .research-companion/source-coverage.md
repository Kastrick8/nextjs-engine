# Source Coverage — Generation 2

## Scope
- Read the recursive `main-2` tree; it was not truncated.
- Inspected the tracked JavaScript/TypeScript source blobs in `src/`, `bin/`, `scripts/`.
- Inspected remaining tracked app, config, example and browser-test files outside those directories.
- Compared blob hashes with `main-3` and avoided rereading identical blobs.
- Parsed the named value/type re-exports in the Gen 2 root and server entrypoints.

## Counts
| Scope | Files/blobs |
|---|---:|
| main-2 JS/TS under src, bin, scripts | 140 |
| main-3 JS/TS under src, bin, scripts | 318 |
| Exact shared blobs | 70 |
| Unique JS/TS blobs across both branches | 388 |
| Additional unique tracked app/config/example/test files | 64 |

## Areas covered
Factories, schema/types, UI components, core runtimes, hooks/providers, EngineAPIResolver/APIStatic, config parser/Next.js plugin, CLI, smoke tests, browser tests, app fixtures and example routes.

## Exclusions
No node_modules, .next, dist, generated caches, package dependencies or binary assets. GitHub source blobs were inspected remotely; no local clone or local shell check is claimed.
