# Public Compiler API

The compiler API is public in Generation 3, but most application pages should use `createPage()`. Direct compiler calls are intended for advanced integrations, diagnostics, build tooling and runtime inspection.

## Main compiler

`compilePage(schema, options?)` produces a compiled page model that contains the compiled nodes, feature manifest, diagnostics and execution-related metadata.

The result can be inspected through:
- `findCompiledNode(compiled, id)`
- `explainCompiledNode(compiled, id)`
- `compileEngineUsedFeatureManifest()`

## Fallback and compatibility

The fallback API compiles and resolves per-feature fallback policies:
- `compileEngineFallbackPlan()`
- `resolveEngineFallbackPlan()`
- `ENGINE_DEFAULT_FALLBACK_POLICIES`
- `createEngineBrowserSupportResolver()`
- `supportsEngineBrowserFeature()`
- `resolveEngineBrowserCompatibility()`

The compiler compatibility manifest describes the browser features used by a page. The compatibility resolver compares them with runtime support and determines what can safely fall back.

## Artifacts and cache inspection

- `compileEngineArtifact()` and `fingerprintEngineArtifact()` produce artifact identity/results.
- `inspectEngineArtifactGraph()` inspects the graph.
- `invalidateEngineArtifacts()` invalidates affected artifacts.

The Next.js plugin also owns build-time artifact caching and filesystem staging. Those plugin internals are not public APIs.

## Runtime profiles

`registerEngineRuntimeProfile()`, `unregisterEngineRuntimeProfile()`, `getEngineRuntimeProfile()`, `getEngineRuntimeRegistryRevision()` and `resolveNodeRuntime()` control or inspect registered runtime profiles used by the compiler.

## Budgets and security diagnostics

- `evaluateEngineBuildBudgets()` evaluates measurements against limits.
- `assertEngineBuildBudgets()` throws `EngineBuildBudgetError` when the configured budget fails.
- `compileEngineSecurityDiagnostics()` creates compiler security diagnostics.
- `assertEngineSecurityDiagnostics()` enforces the selected diagnostics policy.

Use [the complete export inventory](./exports.md) for all option, result, report and diagnostic types. See [compiler internals](../ne/compiler/index.md) for how the internal pipeline implements these public contracts.
