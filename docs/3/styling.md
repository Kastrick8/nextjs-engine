# Styling — Generation 3 (Simple Guide)

> **GENERATION 3 · ALPHA** · Source of truth: `main-3`.

## Style a node

```ts
{
  type: "card",
  props: {
    bg: "#111827",
    color: "#f9fafb",
    px: "1.5rem",
    py: "1rem",
    borderRadius: "12px",
    transform: "translateY(-2px)",
  },
}
```

## Make it responsive

```ts
props: {
  px: { xs: "1rem", md: "2rem" },
  columns: { xs: 1, md: 2, lg: 3 },
  bg: { xs: "#111827", md: "#030712" },
}
```

Responsive values compile to CSS variables and media-query rules. The browser selects the matching breakpoint; normal responsive style props do not need a JavaScript resize loop.

## Hover and focus

```ts
cprop: {
  onHover: { transform: "scale(1.02)" },
  onFocus: { outline: "2px solid #60a5fa" },
}
```

Supported pseudo-state bags compile to CSS classes.

## Style precedence

```text
component defaults < variant defaults < schema props < explicit style={} < required runtime state
```

Explicit styles override defaults while required runtime behavior, such as disabled controls and open overlays, remains protected.

For breakpoint fallback rules, responsive cache limits, nested at-rules, and StyleCollector ownership, read [Styling — detailed](./styling-detailed.md). For stable 2.x apps, use [Gen 2 styling](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/styling.md).
