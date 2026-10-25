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

## Low-level style helpers

The public package exports `staticClass` and `mediaClass` for advanced custom-component code. Prefer schema responsive props for ordinary responsive styles.

```tsx
import type { ReactNode } from "react";
import { staticClass, useEngineContext } from "nextjs-engine";

export function CustomFrame({ children }: { children: ReactNode }) {
  const { styleCollector } = useEngineContext();
  const layoutClass = staticClass({
    display: "grid",
    gap: "1rem",
    maxWidth: "1200px",
    marginInline: "auto",
  }, styleCollector);

  return <div className={layoutClass}>{children}</div>;
}
```

- `staticClass(style, collector?)` compiles a CSS style object to a generated class. Inside an Engine-managed component, pass `useEngineContext().styleCollector` so the rule is registered in the stylesheet emitted by that provider.
- `mediaClass(base, ...breakpoints)` creates a class with base declarations and `min-width` media overrides. Its current public signature has no collector parameter and registers through the low-level global fallback. Do not assume it joins the active provider stylesheet automatically; for ordinary component-scoped responsive styles, use responsive schema props instead.
- `EngineGlobalStyles()` emits only CSS explicitly registered through `StyleCollector.addGlobal()`. It does not sweep up provider-collected CSS or turn the low-level global fallback into global CSS.

## Client-side style reconciliation

The current provider path includes `EngineCollectedStyles`, which subscribes to
the nearest `StyleCollector`. When new rules are added after hydration, the
collector schedules a notification and the style component reconciles its CSS
snapshot. It first adopts the existing server-emitted style text when present,
so the initial client render can match SSR before subscription updates are
applied.

This behavior depends on styles being registered with the relevant provider's
collector. For `staticClass(style, collector)`, pass the active
`useEngineContext().styleCollector` rather than relying on the low-level global
fallback. The public `mediaClass(base, ...breakpoints)` helper currently has no
collector parameter and registers with that global fallback; for normal
component-scoped responsive styles, prefer schema responsive props.

## Related

- [Simple Gen 3 styling](./styling.md)
- [Gen 3 overview](../gen3/overview.md)
- [Compiler, rendering, and runtime](./compiler-rendering-runtime.md)
- [Gen 2 detailed styling](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/styling-detailed.md)
