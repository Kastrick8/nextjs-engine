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

createTheme() creates a validated theme definition. Its public shape is `createTheme(definition, options?)`, not a single options object:

```ts
interface CreateEngineThemeOptions {
  registry?: EngineComponentRegistry;
}

function createTheme<T extends EngineThemeDefinition>(
  definition: T,
  options?: CreateEngineThemeOptions
): Readonly<T & { scope: EngineThemeScope }>;
```

The first argument is the serializable theme definition. The optional second argument scopes runtime registration to an `EngineComponentRegistry`; it is not included in `.etr` output. Theme objects are JSON data; creating one does not fetch a URL, publish it, download fonts or evaluate code. See the complete [EngineTheme public API](./theme.md) and [module reference](../module/enginetheme.md).

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



## React and Next.js interoperability

The Create API is additive to React, not a replacement for ordinary JSX. Use normal Next.js pages and components where application-owned state/data/forms are more suitable, `createComponent()` to embed a schema region inside JSX, and `createPage()` when the route itself should be schema-driven. Browser hooks, events and browser APIs still require the appropriate Client Component boundary. See [React and JSX integration](../integrations/react-and-jsx.md).

## Generation 2 compatibility

Gen 2 supports schema-backed `createPage()` and `createComponent()`, but it does not have the Generation 3 `createComponent({ mode: "custom", ... })` adapter overload, `createTheme()`, or compiler/server-first options. Copying those imports/options into Gen 2 produces TypeScript missing-export or type-checking errors. See [Migrating from Gen 2](../guides/migrating-from-gen2.md).
