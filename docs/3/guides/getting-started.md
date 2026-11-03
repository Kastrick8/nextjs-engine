# Getting Started with Generation 3

This guide builds a small schema-driven page using the public package API.

## 1. Define the page

```tsx
import { createPage, defineSchema } from "nextjs-engine";

const schema = defineSchema({
  meta: {
    title: "My first Engine page",
    description: "A page built with Next.js Engine."
  },
  root: {
    type: "section",
    props: { p: 4, gap: 3 },
    children: [
      { type: "heading", props: { content: "Hello Engine" } },
      { type: "text", props: { content: "A typed schema rendered by Next.js." } },
      {
        type: "button",
        props: { label: "Explore modules", variant: "primary" }
      }
    ]
  }
});

export default createPage({ schema });
```

## 2. Understand the tree

```text
PageSchema
└── root: section
    ├── heading
    ├── text
    └── button
```

Each node identifies a registered component type. Props are validated and rendered by the Engine. Check the [Primitives](../module/primitives.md) and [Schema API](../api/schema.md) references for the supported contract.

## 3. Add configuration

Use `createPage({ config })` for page-level Engine settings. Use the [Configuration section](../configuration/index.md) for provider files, APIStatic routes and Next.js plugin options.

## 4. Continue

- [Module catalog](../module/index.md)
- [Create API family](../api/create.md)
- [Styling](../module/styling.md)
- [NE architecture](../ne/architecture.md)
