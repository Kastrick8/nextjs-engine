# Generation 3 — Styling Basics

> **Generation:** 3 · **Version:** v3.0.0-alpha.1 · **Level:** Simple guide

Gen 3 keeps familiar Engine styling props—responsive values, regular CSS properties, `style`, and `cprop`—but moves style transformation into a dedicated compiler module.

## Basic styling

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

## Responsive layout

```ts
props: {
  px: { xs: 16, md: 32 },
  bg: { xs: "#111827", lg: "#030712" },
}
```

Responsive values compile to CSS custom properties and media-query rules. For these ordinary style props, the browser selects the matching breakpoint; the Engine does not need a JavaScript resize loop.

## Hover and focus styles

```ts
cprop: {
  onHover: { transform: "scale(1.02)" },
  onFocus: { outline: "2px solid #60a5fa" },
}
```

## Style precedence

```text
component defaults < derived/variant styles < schema props < explicit style={} < required runtime state
```

Explicit styles override ordinary component defaults, while required runtime styles can stay in control when needed for behavior (such as a disabled button or open overlay).

For responsive fallback behavior, supported at-rules, pseudo-states, caching, and collector ownership, see the [detailed styling contract](./detailed/styling-contract.md).
