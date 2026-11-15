# Source Coverage — Generation 3

## Coverage performed
- Recursive Git tree fetched from `main-3`; response was not truncated.
- Read every tracked first-party JavaScript/TypeScript source blob in `src/`, `bin/` and `scripts/`.
- Audited the remaining tracked config, app route, generated NENC type/route, example and browser-test blobs outside those directories.
- Compared blob hashes with `main-2` to avoid re-reading identical source blobs.
- Read the root and split public API entrypoints separately and parsed their exact named exports.

## Counts
| Scope | Files/blobs |
|---|---:|
| main-3 JS/TS under src, bin, scripts | 318 |
| main-2 JS/TS under src, bin, scripts | 140 |
| Identical blobs shared between branches | 70 |
| Unique JS/TS blobs across both branches | 388 |
| Additional unique tracked app/config/example/test files outside src/bin/scripts | 64 |

These are audited tracked-source counts from the branch tree, not a claim that generated files, package dependencies or binary assets were copied into this notes folder.

## Areas covered
- Main entrypoints, package manifests, TypeScript config and Next.js plugin wiring.
- Components, schema/types, registries, providers, hooks and core runtimes.
- Gen 3 compiler stages, runtime registry, fallback/security/artifact/build budget implementations.
- Gen 3 EngineTheme, EngineSEO, EngineDebug, EngineCookies, NENC and error-reporting code.
- Gen 2/Gen 3 EngineAPIResolver, APIStatic, browser/device, scroll, transitions, shader, Canvas, Manim and overlay implementations.
- NE-CLI source and task scripts.
- Smoke scripts, browser test specs, app route fixtures and the Generation 3 private-search example.

## Exclusions
- No node_modules, .next, dist, generated build caches or installed package internals were scanned.
- GitHub connector source blobs were reviewed; a local git clone and local shell execution were not available in this host session.
- Source/test claims should be rechecked against the current branch when source changes.
