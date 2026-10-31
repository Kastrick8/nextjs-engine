# Create API Family

The Create family contains the public factories that establish Engine pages, reusable schema components, page schemas and theme definitions.

| API | Purpose |
|---|---|
| createPage() | Creates a Next.js page component from a schema, direct schema input or Markdown file |
| createComponent() | Creates a reusable schema component or a trusted local React component adapter |
| createTheme() | Validates and creates an EngineTheme definition |
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
      { type: "text", props: { content: "Built with Next.js Engine." } }
    ]
  }
});

export default createPage({ schema });
~~~

The current Generation 3 implementation accepts a schema wrapper, a direct page-schema object, or Markdown-file options. Shared options include config, named handlers, slots, mobile/tablet adaptation, scoped registry and compiler settings.

### Server-first behavior

Generation 3 selects the server-first renderer for eligible schemas by default. The current implementation selects the compatibility/provider renderer when named handlers are supplied or when compiler.serverFirst is explicitly disabled. An explicit scoped EngineComponentRegistry requires the server-first path.

This is eligibility-based behavior, not a promise that every arbitrary React component or schema tree is server-rendered. See [Compiler architecture](../ne/compiler/index.md).

## createComponent()

createComponent() creates a reusable React component from a schema:

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

For a trusted, application-owned React component, Generation 3 also supports the explicit custom mode:

~~~tsx
import { createComponent, registerComponent } from "nextjs-engine";
import { SiteLinkImplementation } from "./SiteLinkImplementation";

const SiteLink = createComponent({
  mode: "custom",
  id: "site-link",
  theme: "site.link",
  component: SiteLinkImplementation,
  props: {
    href: { type: "string", required: true, maxLength: 2048 },
    target: { type: "string", enum: ["_self", "_blank"] }
  },
  slots: ["children"],
  strictProps: true
});

registerComponent("site-link", SiteLink);
~~~

Custom mode wraps trusted local React code with a declared schema prop/slot contract. It does not load executable code from a remote theme. See [Custom Engine Components](../module/engine-custom-components.md).

## createTheme()

createTheme() creates a validated theme definition. Theme objects are JSON data; creating one does not fetch a URL, publish it, download fonts or evaluate code.

~~~ts
import { createTheme } from "nextjs-engine";

export const siteTheme = createTheme({
  id: "site",
  scope: "global",
  button: {
    defaults: {
      backgroundColor: "#2563eb",
      color: "#ffffff"
    },
    variants: {
      quiet: {
        defaults: {
          backgroundColor: "transparent",
          color: "#2563eb"
        }
      }
    }
  }
});
~~~

Supported namespaces, tokens, slots, CSS restrictions, qualified IDs and local/global/remote loading are documented in [EngineTheme](../module/enginetheme.md).

## defineSchema()

~~~ts
import { defineSchema } from "nextjs-engine";

export const pageSchema = defineSchema({
  root: {
    type: "box",
    children: [
      { type: "heading", props: { content: "Hello" } }
    ]
  }
});
~~~

defineSchema() preserves the PageSchema type and returns the schema value; it does not perform runtime compilation.

## Related references

- [Schema types](./schema.md)
- [Component registry](./component-registry.md)
- [Hooks](./hooks.md)
- [EngineTheme](../module/enginetheme.md)
- [Generation 3 compiler](../ne/compiler/index.md)
