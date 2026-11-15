# Generation 3 Compiler

The compiler converts a supported schema into a plan describing render ownership, work priority, browser feature requirements, assets and diagnostics.

## Pipeline

~~~text
schema
  → schema analysis
  → compilePage()
  → used-feature manifest
  → execution / fallback plan
  → artifact graph + build budgets
  → EngineServerRenderer
  → client islands when required
~~~

## Responsibilities

| Concern | Description |
|---|---|
| Schema compilation | Interpret page schema and build a compiled page representation |
| Runtime ownership | Classify nodes/work as static, server or client where supported |
| Work classes | Prioritize critical, visible, near, deferred, idle and sleeping work |
| Feature manifest | Record browser/runtime capabilities needed by the page |
| Fallback planning | Resolve native, fallback and unavailable strategies |
| Artifact graph | Track compiled outputs and their relationships |
| Security diagnostics | Evaluate supported build/security conditions |
| Build budgets | Report or enforce configured artifact/build limits |

## Public compiler APIs

The public barrel exposes compilePage(), used-feature manifest helpers, fallback-plan functions, artifact compilation/inspection and invalidation helpers, runtime profile registration and build-budget functions.

Most applications should use [createPage()](../../api/create.md). Direct compiler calls are for tooling, inspection and advanced integrations.

## Detailed references

- [Compiler deep dive](../../compiler-deep-dive.md)
- [Compiler, rendering and runtime](../../compiler-rendering-runtime.md)

## Related

- [NE architecture](../architecture.md)
- [Runtime](../runtime.md)
- [Compatibility](../compatibility.md)
- [NE-CLI](../cli/index.md)
