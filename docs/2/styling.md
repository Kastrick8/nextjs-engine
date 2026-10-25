# Generation 2 — Styling Basics

> **Generation:** 2 · **Version:** v2.6.2 · **Level:** Simple guide

Use Engine props for common layout, regular CSS properties for additional styles, and `style` for explicit overrides.

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

## Responsive values

```ts
props: {
  px: { xs: 16, md: 32 },
  bg: { xs: "#111827", lg: "#030712" },
}
```

Generation 2 uses `xs`, `sm`, `md`, `lg`, `xl`, and `2xl` breakpoints. Explicit values cascade forward until a later breakpoint overrides them. Only props typed to accept responsive values support breakpoint maps.

For spacing/sizing props that use the resolver, a number is converted from sixteenths of a rem: `16` becomes `1rem`, `32` becomes `2rem`, and `0` remains `0`.

## Hover and focus styles

```ts
cprop: {
  onHover: { transform: "scale(1.02)" },
  onFocus: { outline: "2px solid #60a5fa" },
}
```

## Need exact rules?

The [detailed styling contract](./detailed/styling-contract.md) covers responsive values, fallbacks, at-rules, pseudo-state styles, and how the v2 hook/resolver path works.
