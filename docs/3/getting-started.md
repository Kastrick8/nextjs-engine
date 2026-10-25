# Generation 3 — Getting Started

> **Generation:** 3 · **Version:** v3.0.0-alpha.1 / `main-3` · **Level:** Simple guide

The normal Gen 3 entry point is still `createPage()`. For standard schema pages, it uses the Engine compiler and server-first renderer by default. Some migration cases can temporarily select the v2 renderer with `compiler.serverFirst: false`.

```tsx
import { createPage } from "nextjs-engine";

export default createPage({
  schema: {
    root: {
      type: "section",
      children: [
        { type: "heading", props: { content: "Hello from Generation 3", level: 1 } },
        { type: "text", props: { content: "The compiler creates a page plan before rendering." } },
      ],
    },
  },
  compiler: {
    pageId: "home",
    strict: true,
  },
});
```

## What happens

1. `createPage()` normalizes the schema and compiler options.
2. `compilePage()` creates an `EngineCompiledPage` plan.
3. The plan records runtime ownership, work classes, used browser features, assets, fallback information, and diagnostics.
4. `EngineServerRenderer` keeps durable content server-rendered where possible and adds client islands where browser behavior is required.
5. Runtime systems handle eligible client work.

## Continue

- [Compiler basics](./compiler.md) gives a plain-language explanation.
- [Detailed compiler internals](./detailed/compiler-internals.md) explains the plan and source files.
- [Styling basics](./styling.md) explains the public styling surface.
- [Component reference](./components/index.md) contains detailed component APIs.

This guide targets the v3 alpha line, not stable v2. See [Generation 2 docs](../2/index.md) for v2.6.2.
