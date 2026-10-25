# Generation 2 — Start Here

> **Generation:** 2 · **Version:** v2.6.2 · **Source:** `main-2` · **Level:** Simple overview

Generation 2 is the stable 2.x documentation line. It describes the schema renderer, component registry, responsive resolver, and shared UI components as implemented in the v2.6.2 source.

Use these guides for existing Generation 2 applications. **Do not copy Gen 3 compiler APIs into a v2 project:** Gen 3 adds a separate compile plan and server-first renderer and remains an alpha line.

## Start with a task

| I want to… | Read |
| --- | --- |
| Create my first v2 schema page | [Getting started](./getting-started.md) |
| Style components and responsive layout | [Styling basics](./styling.md) |
| Understand the v2 styling implementation | [Detailed styling contract](./detailed/styling-contract.md) |
| Understand how rendering works | [Detailed architecture](./detailed/architecture.md) |
| Browse component APIs | [Component reference](./components/index.md) |
| Diagnose schema errors and warnings | [Schema diagnostics](./detailed/schema-diagnostics.md) |
| Understand runtime and lazy-loading trade-offs | [Runtime performance](./detailed/runtime-performance.md) |
| Read earlier releases | [Release history](./release/index.md) |

## Generation 2 in one diagram

```text
PageSchema
   ↓
createPage()
   ↓
EngineProvider + SchemaRenderer
   ├─ resolves schema nodes through the component registry
   ├─ applies responsive props and styles
   └─ collects generated CSS
   ↓
React / Next.js render
```

For the compiler-first model, see [Generation 3](../3/index.md).
