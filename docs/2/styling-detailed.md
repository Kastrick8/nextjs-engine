# Styling — Generation 2 (Detailed Reference)

> **GENERATION 2 · STABLE 2.x** · Verified against `main-2`, including `src/engine/hooks/usePropStyles.ts` and its resolver/collector imports.

## Implementation path

In Gen 2, `usePropStyles()` combines Engine props and direct CSS props into React style properties. Responsive values use the core resolver; pseudo-state bags are converted into generated CSS classes by the `cpropClass` path. The hook imports `resolveSpacing`, `resolveGeneric`, `resolveColumns`, `isResponsive`, and `normalizeSpacingValue` from the core resolver.

This is a hook/resolver-oriented implementation. It is not the dedicated `EngineStyleCompiler` path used by Gen 3.

## Responsive values

Documented breakpoint keys are `xs`, `sm`, `md`, `lg`, `xl`, and `2xl`. A supplied value remains active until a later supplied breakpoint changes it. Do not assume every valid CSS property accepts a responsive map; schema types define the supported surface.

## Direct CSS and precedence

Standard CSS properties can be supplied beside Engine shorthands. `bg` and `background` refer to the same background property; where both are provided, the documented contract gives `bg` precedence.

Built-in components layer defaults, variants, schema props, explicit `style`, and required runtime state. Runtime state can remain authoritative when overriding it would break component behavior, such as disabled controls.

## At-rules and pseudo-state styles

The current styling contract describes `EngineStyleObject` support for conditional rules such as `@media` and `@supports`, plus rule types such as `@keyframes` and `@font-face`. Nested conditional rules retain their parent condition. Supported state bags include `onHover`, `onFocus`, `onActive`, `onChecked`, `onDisabled`, and `onPlaceholder`.

Check current schema types and serializer behavior before relying on uncommon at-rules or nested values.

## Style collection and limitations

Generated styles use the Engine style collector/provider path. The low-level global collector is a compatibility fallback for helpers used outside an Engine provider; do not assume all page styles are globally shared. Verify client-side rule generation against the v2 implementation and tests rather than assuming a future stylesheet-flushing feature exists.

## Related

- [Simple Gen 2 styling](./styling.md)
- [Gen 3 simple styling](../3/styling.md)
- [Gen 3 detailed styling](../3/styling-detailed.md)
