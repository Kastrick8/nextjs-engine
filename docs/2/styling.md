# Styling — Generation 2 (Simple Guide)

> **GENERATION 2 · STABLE 2.x** · Source of truth: `main-2`.

## Style a node

Put Engine shorthand props and ordinary CSS properties together:

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
  px: { xs: "1rem", md: "2rem" },
  columns: { xs: 1, md: 2, lg: 3 },
  bg: { xs: "#111827", md: "#030712" },
}
```

A breakpoint value stays active until a later supplied breakpoint overrides it. Use responsive maps only for properties supported by the schema types.

## Hover and focus

```ts
cprop: {
  onHover: { transform: "scale(1.02)" },
  onFocus: { outline: "2px solid #60a5fa" },
}
```

## Next step

This is the usage guide. For at-rules, precedence, responsive behavior, and the v2 hook/resolver implementation, read [Styling — detailed](./styling-detailed.md).

Gen 3 has a separate style compiler; see [Gen 3 styling](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/styling.md) only if you are evaluating or migrating to the alpha line.
