# Generation 3 — Compiler Internals

> **Generation:** 3 · **Version:** v3.0.0-alpha.1 / `main-3` · **Level:** Detailed implementation reference

This page describes the compiler flow represented by the current Gen 3 source.

## Compiler flow

```text
PageSchema / SchemaNode
          ↓
     compilePage(schema)
          ↓
 EngineCompiledPage / enginePlan
   ├─ runtime ownership per compiled node
   ├─ work class / scheduling metadata
   ├─ used-feature manifest
   ├─ asset graph
   ├─ fallback plan
   └─ diagnostics and source metadata
          ↓
 EngineServerRenderer
   ├─ server-render durable content where possible
   └─ add client islands for required browser behavior
          ↓
 EngineScheduler + EngineViewport + EngineModel
```

## Difference from Gen 2

Gen 2 primarily sends the schema through `SchemaRenderer` and the component registry. Gen 3 adds `compilePage()` and returns an `EngineCompiledPage` base plan, exposed as `enginePlan` on the page component for tooling.

`createPage()` wires in `compilePage`, `compileAdaptiveSchema`, and `EngineServerRenderer`. The `compiler.serverFirst` option permits a temporary v2-renderer path for migration. Do not describe the server-first path as unconditionally forced for every migration configuration.

## Plan responsibilities

| Output | Why it exists |
| --- | --- |
| Runtime ownership | Keeps static/server work out of browser-only execution when possible. |
| Work class | Gives scheduling metadata for client-side work. |
| Feature manifest | Describes browser/rendering features the page actually uses for compatibility handling. |
| Asset graph | Records asset requirements and dependencies. |
| Fallback plan | Describes how to handle missing browser capabilities. |
| Diagnostics | Supports validation and developer-facing attribution. |

The base plan is request-independent; the runtime can adapt the effective schema for device class. Treat request-specific adaptive output as distinct from the base `enginePlan`.

## Source map

- `src/engine/compiler/EngineCompiler.ts` — main compiler pass and plan creation.
- `src/engine/compiler/types.ts` — compiled page and plan types.
- `src/engine/compiler/EngineServerRenderer.tsx` — server-first schema rendering.
- `src/engine/compiler/EngineAdaptiveCompiler.ts` — phone/tablet schema adaptation.
- `src/engine/compiler/EngineFallbackCompiler.ts` — feature fallback planning.
- `src/engine/compiler/EngineCompatibilityManifest.ts` — used-feature compatibility metadata.
- `src/engine/compiler/EngineArtifactGraph.ts` — artifact dependency graph.
- `src/engine/createPage.tsx` — entry point wiring the compiler to Next.js.

## Important boundary

The Engine compiler is an additional schema compilation/runtime stage inside a Next.js app. It does not replace Next.js's app compiler or bundler. The regular `next build` process still produces the application output.

For more detail, read [Compiler and scheduler](./compiler-and-scheduler.md), [Network and credentials](./network-and-credentials.md), and [Compatibility and hardening](./compatibility-and-hardening.md).
