# Styling — Generation 3 (Detailed Reference)

> **GENERATION 3 · ALPHA** · Source reviewed on `main-3`: `src/engine/hooks/usePropStyles.ts` delegates to `src/engine/compiler/EngineStyleCompiler.ts`. Source and tests remain authoritative if this page becomes stale.

## Compilation path

1. `usePropStyles()` obtains the nearest provider's `StyleCollector`.
2. It calls `compileEngineStyles(props, styleCollector, extraStyle)`.
3. Related compiler helpers compile pseudo-state styles, static classes, and media classes.
4. The collector stores CSS for the current Engine rendering boundary.

This centralizes style transformation rather than keeping it inside the hook, helping server and client rendering share one style contract.

## Responsive values and first-paint fallback

The documented breakpoint keys are `xs`, `sm`, `md`, `lg`, `xl`, and `2xl`. Explicit values become CSS-variable declarations and media-query overrides. A value remains active until a later explicit breakpoint overrides it. A map without `xs` must not force a later breakpoint value onto smaller screens.

Scalar responsive values and maps with an explicit `xs` value can provide a CSS-variable fallback for initial paint. This helps avoid a temporary browser-default style while collected CSS is parsed. A map omitting `xs` does not borrow a later value as its fallback.

## Responsive resolver cache

Responsive maps are serialized in canonical breakpoint order before memoization. The cache key also accounts for spacing normalization, preventing semantically equivalent maps from duplicating work just because object key order differs. Generated variable identifiers use a longer paired hash than the older five-character truncation.

The documented memo cache is LRU-style and capped at 2,048 entries. This bounds growth from applications that generate many unique responsive values. It is not a promise that all generated CSS is cached process-wide.

## Style precedence

```text
component defaults < semantic/variant defaults < Engine/schema props < explicit style={} < required live runtime state
```

Required runtime state remains last where overriding it would break behavior, for example disabled controls or open overlays.

## At-rules and pseudo-state styles

The `EngineStyleObject` path supports ordinary properties alongside supported `@...` entries. Conditional rules such as `@media` and `@supports` retain nested condition scopes. Keyframe selectors remain inside `@keyframes`; declaration at-rules such as `@font-face`, `@page`, and `@property` emit declarations in their own rule format.

Supported pseudo-state bags include `onHover`, `onFocus`, `onActive`, `onChecked`, `onDisabled`, and `onPlaceholder`. These compile into generated classes. At-rules nested inside a pseudo-state preserve the pseudo selector within the conditional scope.

## StyleCollector ownership

Generated CSS is collected by the nearest `EngineProvider`. Each page/component provider owns its collector; nested `createComponent()` boundaries should not reset a parent's collector or re-emit styles already collected by it. Exact CSS content is deduplicated inside a collector.

Ordinary generated CSS is not retained as a process-wide cross-request cache: each response needs its own stylesheet. The explicit global-style path is separate and exists for styles intentionally added through `StyleCollector.addGlobal()`. A low-level global collector remains a compatibility fallback for helpers used outside a provider.

## Known limitation

Post-hydration dynamic rule flushing remains a limitation: application code may create a new responsive or pseudo-state rule after hydration while stylesheet DOM flushing remains primarily server-oriented. Do not assume the complete SSR stylesheet is automatically re-emitted on the client.

## Related

- [Simple Gen 3 styling](./styling.md)
- [Gen 3 overview](../gen3/overview.md)
- [Compiler and server rendering details](../gen3/phase-a-b.md)
- [Gen 2 detailed styling](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/styling-detailed.md)
