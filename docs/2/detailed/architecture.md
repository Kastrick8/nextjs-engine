# Generation 2 — Rendering and Styling Architecture

> **Generation:** 2 · **Version:** v2.6.2 / `main-2` · **Level:** Detailed architecture

This page describes the Gen 2 implementation. It is not a description of the Generation 3 compiler model.

## Rendering path

```text
PageSchema
   ↓
createPage()
   ↓
EngineProvider / EngineScrollProvider
   ↓
SchemaRenderer + component registry
   ↓
React / Next.js output
```

The v2 page factory normalizes page/schema options and renders nodes through `SchemaRenderer`. The component registry maps each schema node type to its registered React component. The page factory also supports handlers, slots, configuration, and mobile schema patches.

## Styling path

The v2 style flow is hook/resolver-oriented:

1. `usePropStyles()` translates Engine props and direct CSS props into React style values.
2. Responsive values use the resolver in `src/engine/core/resolver.ts`.
3. Pseudo-state bags such as `cprop.onHover` become generated class names.
4. `StyleCollector` gathers the CSS emitted by the Engine for rendering.

The exact public contract is in the [detailed styling reference](./styling-contract.md).

## Source map

- `src/engine/createPage.tsx` — page factory and option normalization.
- `src/engine/core/SchemaRenderer.tsx` — schema walking and rendering.
- `src/engine/core/registry.ts` — node registry.
- `src/engine/hooks/usePropStyles.ts` — props-to-style conversion.
- `src/engine/core/resolver.ts` — responsive and spacing-value resolution.
- `src/engine/core/StyleCollector.ts` — generated CSS collection.

## What changes in Generation 3?

Gen 3 introduces `compilePage()` and an `EngineCompiledPage`/`enginePlan` contract, followed by the server-first renderer. The Gen 2 `SchemaRenderer` path does not guarantee that plan. See [Gen 3 compiler basics](../../3/compiler.md) and [Gen 3 compiler internals](../../3/detailed/compiler-internals.md).
