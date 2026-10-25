# Generation 2 — Getting Started

> **Generation:** 2 · **Version:** v2.6.2 / `main-2` · **Level:** Simple guide

Use the v2 `createPage()` API with a page schema. This basic example uses the public factory and schema shape.

```tsx
import { createPage } from "nextjs-engine";

export default createPage({
  schema: {
    root: {
      type: "section",
      props: {
        px: { xs: 16, md: 32 },
        py: 24,
        bg: "#111827",
        color: "#f9fafb",
      },
      children: [
        { type: "heading", props: { content: "Hello from Generation 2", level: 1 } },
        { type: "text", props: { content: "Responsive layout values are handled by the Engine style resolver." } },
      ],
    },
  },
});
```

## How to read the schema

1. `root` is the page's top-level node.
2. `type` selects a built-in component.
3. `props` contains that component's values.
4. `children` holds nested nodes or text.
5. Responsive maps such as `px: { xs: 16, md: 32 }` let supported values change by breakpoint.

Use the [component reference](./components/index.md) for component-specific props and the [styling guide](./styling.md) for common styling.

## Version boundary

This example targets the Generation 2 / v2.6.2 API represented by branch `main-2`. Gen 2 uses the schema renderer and does not expose the Gen 3 `compilePage()`/`enginePlan` contract. For compiler-era behavior use [Generation 3](../3/index.md).
