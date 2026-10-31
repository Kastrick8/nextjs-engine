# Create API Family

The Generation 2 Create family defines schema-driven pages, reusable schema components and typed page schemas.

| API | Purpose |
|---|---|
| createPage() | Returns a Next.js page component from a schema, direct schema input or Markdown file |
| createComponent() | Returns a reusable React component for an Engine schema |
| defineSchema() | Preserves the typed PageSchema contract |

## createPage()

~~~tsx
import { createPage, defineSchema } from "nextjs-engine";

const schema = defineSchema({
  meta: { title: "Catalog", description: "Browse the catalog." },
  root: {
    type: "section",
    children: [
      { type: "heading", props: { content: "Catalog" } },
      { type: "text", props: { content: "Built with Generation 2." } }
    ]
  }
});

export default createPage({ schema });
~~~

Supported input forms are schema options, a direct schema object and Markdown-file options. createPage() also accepts config, named handlers, named slots and mobile schema patches.

## createComponent()

~~~tsx
import { createComponent } from "nextjs-engine";

export const ProductCard = createComponent({
  schema: {
    root: {
      type: "card",
      children: [
        { type: "heading", props: { content: "Product" } },
        { type: "text", props: { content: "Reusable schema component." } }
      ]
    }
  }
});
~~~

It accepts the same page schema forms as a schema page except Markdown file input. Runtime children and slots can be supplied to the returned component.

## defineSchema()

~~~ts
import { defineSchema } from "nextjs-engine";

export const pageSchema = defineSchema({
  root: {
    type: "box",
    children: [{ type: "heading", props: { content: "Hello" } }]
  }
});
~~~

Generation 2 has no createTheme() factory or compiler-first page option family. Page-level theme data remains part of PageSchema. See [Schema Types](./schema.md), [Component Registry](./component-registry.md) and [Getting Started](../guides/getting-started.md).
