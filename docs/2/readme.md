# Next.js Engine — Generation 2 Developer Reference

> **GENERATION 2 · STABLE 2.x** · Source branch: main-2.
>
> This guide describes the stable Generation 2 API contract. Generation 3 is a separate alpha architecture; use its [versioned documentation](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/index.md) only when evaluating or migrating to Gen 3.

## What it is

Next.js Engine 2 is a schema-driven React/Next.js component and rendering layer. It lets applications describe supported layouts and UI components as typed schema objects while retaining normal React components for custom behavior.

The schema renderer, style collector, component registry, providers, media components and browser helpers have distinct contracts. Performance behavior depends on the component and its props; the engine does not remove the need to profile an application's routes or verify the behavior of custom components.

## Generation 2 architecture

~~~text
PageSchema
    ↓
createPage()
    ↓
SchemaRenderer
    ├─ schema-node registry
    ├─ EngineProvider and named handlers
    ├─ responsive style resolution
    ├─ collected CSS
    └─ component-specific lazy/viewport behavior
    ↓
React / Next.js rendering
~~~

Generation 2 uses the client-capable schema renderer and provider model. Do not describe it as the Generation 3 compiler/server-first execution-plan architecture. For details on the stable page and schema APIs, continue with this reference and the [Gen 2 index](./index.md).

## Public imports

In application code, prefer the installed package entry point:

~~~ts
import { createPage, createComponent, defineSchema, registerComponent } from "nextjs-engine";
~~~

Repository-internal aliases such as @/engine are app-specific conveniences, not required API syntax.

## Responsive System

### The Problem with JS-based Responsive

The standard approach in most React apps is to read `window.innerWidth` and conditionally apply styles. This causes:

- Layout shifts on load (JS hasn't run yet when HTML paints)
- Re-renders on every resize
- Hydration mismatches (server sees no width, client sees real width)

### How the Engine Does It

Every `ResponsiveValue<T>` prop is resolved at render time into a CSS custom property with `@media` query overrides. The browser handles all switching in CSS — zero JS involvement at runtime.

```ts
// You write this in your schema:
props: {
  px: { xs: "1rem", md: "2rem", xl: "3rem" }
}

// The engine generates this CSS once and injects it in a <style> tag:
:root { --e-px-a1b2: 1rem }
@media(min-width:768px)  { :root { --e-px-a1b2: 2rem } }
@media(min-width:1280px) { :root { --e-px-a1b2: 3rem } }

// And applies this inline style to the element:
style={{ paddingLeft: "var(--e-px-a1b2)", paddingRight: "var(--e-px-a1b2)" }}
```

The component itself never reads the viewport. It never re-renders on resize. The CSS does everything.

### Responsive Values

Any prop that accepts `ResponsiveValue<T>` can take either a plain value or a breakpoint map:

```ts
// Plain value — same at all sizes
gap: "2rem"

// Responsive — different per breakpoint, cascades upward
gap: { xs: "1rem", md: "1.5rem", xl: "2rem" }
```

Breakpoints cascade upward. If you only define `xs` and `lg`, everything between `sm` and `md` uses the `xs` value.

### Breakpoints

| Key | Min Width |
|-----|-----------|
| `xs` | 0px (base) |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

Custom breakpoints can be passed to `createPage({ config: { breakpoints: { … } } })`.

---



## Rendering and memoization

Individual Engine components may use React.memo or other optimizations, but the public contract does not promise that every rendered component is memoized or that a page tree stops re-rendering after mount. State changes, context updates, route changes, props and named handlers can cause valid renders.

For performance decisions, check the component's own guide and measure the real route. The stable Generation 2 approach includes:

- responsive style values compiled to CSS and media rules rather than a resize listener for each styled node;
- StyleCollector deduplication within its intended scope;
- component-specific lazy or viewport-aware behavior where the component documents it;
- normal React/Next.js rendering behavior for custom components and dynamic state.

Do not assume features documented only for Generation 3—such as NENC execution plans, server-first runtime ownership or the Gen 3 artifact cache—are part of the Gen 2 contract.

## Schema Node Reference

Every node follows this shape:

```ts
{
  type: string,       // component type to render
  key?: string,       // stable React key (recommended for list items)
  props?: object,     // props for the component
  children?: SchemaNode[] | string  // child nodes, or text content
}
```

### Shared Base Props

All nodes accept these props in addition to their type-specific props:

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | HTML id attribute |
| `className` | `string` | CSS class names |
| `style` | `CSSProperties` | Inline style overrides |
| `vars` | `Record<string, string>` | CSS custom properties set inline — cascade to all children |
| `priority` | `boolean` | Skip lazy loading entirely |
| `lazy` | `boolean` | Force lazy (true) or eager (false) |
| `m`, `mt`, `mr`, `mb`, `ml`, `mx`, `my` | `ResponsiveValue<string\|number>` | Margin |
| `p`, `pt`, `pr`, `pb`, `pl`, `px`, `py` | `ResponsiveValue<string\|number>` | Padding |
| `w`, `h`, `minW`, `minH`, `maxW`, `maxH` | `ResponsiveValue<string\|number>` | Sizing |
| `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight` | `ResponsiveValue<string\|number>` | Long-form sizing aliases |
| `bg` | `string` | Background color |
| `color` | `string` | Text color |
| `border` | `string` | CSS border shorthand |
| `borderRadius` | `ResponsiveValue<string\|number>` | Border radius |
| `shadow` | `string` | Box shadow |
| `boxShadow` | `string` | Long-form box shadow alias |
| `transition` | `string` | CSS transition |
| `backgroundImage`, `backgroundSize`, `backgroundRepeat`, `backgroundPosition` | `string` | Background image controls |
| `backdrop`, `backdropFilter` | `string` | CSS backdrop-filter controls |
| `position` | `string` | CSS position |
| `zIndex` | `number` | Z-index |
| `opacity` | `number` | Opacity |
| `overflow` | `string` | Overflow behaviour |
| `sides` | `(1\|2\|3\|4)[]` | Which sides `sideDistance` applies to (1=top 2=left 3=right 4=bottom) |
| `sideDistance` | `string\|number` | Distance applied to each selected side |
| `sideType` | `"margin"\|"padding"` | Whether `sideDistance` maps to margin (default) or padding |
| `onClick` | `string` | Handler name from `createPage({ handlers })` |
| `href` | `string` | Wraps node in an `<a>` tag |

Numbers in spacing/sizing props are treated as pixels divided by 16 (so `16 → 1rem`, `32 → 2rem`).

---

### `vars` — CSS Custom Properties

Set CSS variables directly on any element. They cascade to all children through the standard CSS variable system.

```ts
{
  type: "box",
  props: {
    vars: {
      "--card-bg": "#1a1a2e",
      "--accent":  "#9bcf3a",
      "--radius":  "12px",
    },
    bg: "var(--card-bg)",
  }
}
```

Keys without a leading `--` are auto-prefixed, so `"accent"` and `"--accent"` both work.

### `sides` — Per-Side Spacing

The sides system applies a distance to specific sides of an element using CSS margin (default) or padding. In a CSS grid, adding margin to a cell pushes adjacent cells outward.

**Side numbering:**
```
        1 (top)
         ┌───┐
2 (left) │   │ 3 (right)
         └───┘
        4 (bottom)
```

**Diamond effect on a 3×3 grid** — give the centre cell outward margin on all sides:

```ts
{
  type: "grid",
  props: { columns: 3, gap: "1rem" },
  children: [
    // ... 4 outer cells ...
    {
      type: "box",
      props: {
        sides: [1, 2, 3, 4],   // all four sides
        sideDistance: "32px",  // push 32px outward on every side
        sideType: "margin",    // margin = pushes neighbours (default)
        bg: "#9bcf3a",
      }
    },
    // ... 4 outer cells ...
  ]
}
```

**Top and bottom push only** — vertical stretch effect:

```ts
props: {
  sides: [1, 4],        // top and bottom
  sideDistance: "64px",
}
```

**Padding variant** — push inner content instead of neighbours:

```ts
props: {
  sides: [2, 3],        // left and right sides only
  sideDistance: "2rem",
  sideType: "padding",  // pushes content inward
}
```

---

## Event Handlers

Handlers are provided at the `createPage` level and referenced in schema nodes by name:

```ts
// page.tsx
export default createPage({
  schema: MySchema,
  handlers: {
    openModal: () => setModalOpen(true),
    trackCta:  () => analytics.track("cta_clicked"),
  },
});

// In schema:
{
  type: "button",
  props: { label: "Open", onClick: "openModal" }
}
```

Because handlers are defined outside the schema object, they can close over React state from a parent component if needed.

---

## Theme System

Generation 2 supports page-level inline theme values through the schema theme field. Use these for CSS custom properties, font stylesheets and page-level global styles:

~~~ts
const schema = defineSchema({
  theme: {
    vars: {
      "--e-accent": "#7c3aed",
      "--e-bg": "#0f0f1a",
      "--e-card-bg": "#1a1a2e",
    },
    fonts: [
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
    ],
    globalStyles: "body { background: var(--e-bg); }",
  },
  root: {
    type: "section",
    children: [],
  },
});
~~~

The inline theme is part of the Generation 2 page schema contract. The reusable createTheme() API, qualified component theme variants, static .etr artifacts, remote-theme loader, and theme templates are Generation 3 features; do not use them as Gen 2 examples. See the [Gen 3 EngineTheme guide](https://github.com/Kate-alt-69/nextjs-engine/blob/main-3/docs/3/engine-components/enginetheme.md) when migrating.

## Custom Components

Register trusted local React components as schema node types with registerComponent():

~~~tsx
import { registerComponent } from "nextjs-engine";
import type { ReactNode } from "react";

type PricingCardProps = {
  plan: string;
  price: string;
  children?: ReactNode;
};

function PricingCard({ plan, price, children }: PricingCardProps) {
  return (
    <article className="pricing-card">
      <h3>{plan}</h3>
      <strong>{price}</strong>
      {children}
    </article>
  );
}

registerComponent("pricing-card", PricingCard);
~~~

Use the registered type in schema data:

~~~ts
{
  type: "pricing-card",
  props: { plan: "Pro", price: "$9/mo" },
  children: [
    { type: "text", props: { content: "Unlimited projects" } }
  ],
}
~~~

Register components at module initialization, not during a React render. Schema props should be serializable values; the actual component implementation remains trusted local code. createComponent({ schema }) builds a reusable component from a schema tree—it is not a new custom React component factory.

## createPage API

`createPage` accepts three page definition shapes:

```ts
// Existing full-schema form
export default createPage({
  schema: MySchema,
  config: {
    breakpoints: { … },
    contentMaxWidth: "1400px",
    gapBase: "1rem",
  },
  handlers: {
    myHandler: () => { … }
  },
  slots: {
    mySlot: <MyComponent />
  },
});

// Direct schema form
export default createPage({
  meta: { title: "Home" },
  root: { type: "box", children: [] },
});

// Compact local Markdown page form
export default createPage({
  title: "Privacy Policy — Kastrick",
  description: "Kastrick privacy policy.",
  filePath: "@/data/page/privacy.md",
  markdown: {
    headingColor: "#07111f",
    textColor: "#30475f",
    linkColor: "#12304c",
  },
});
```

When using the Markdown page form, `meta.title` and `meta.description` override the top-level `title` and `description` fallbacks.

The older full-schema signature remains:

```ts
export default createPage({
  schema: MySchema,       // Required — the PageSchema definition
  config: {               // Optional — engine config overrides
    breakpoints: { … },
    contentMaxWidth: "1400px",
    gapBase: "1rem",
  },
  handlers: {             // Optional — named event handlers
    myHandler: () => { … }
  },
  slots: {                // Optional — named React node injections
    mySlot: <MyComponent />
  },
});
```

---

## createComponent API

Use `createComponent` for reusable app chrome or shared UI that still needs to be rendered through the engine. It accepts the same options as `createPage`, but the returned component accepts runtime `slots` and `children`.

```ts
const SiteChrome = createComponent({
  schema: defineSchema({
    root: {
      type: "box",
      children: [
        { type: "section", children: [] },
        { type: "slot", props: { name: "children" } },
      ],
    },
  }),
});

export default SiteChrome;
```

Runtime slots can be passed with `<SiteChrome slots={{ sidebar: <Sidebar /> }}>...</SiteChrome>`. Plain children are injected into `{ type: "slot", props: { name: "children" } }`.

### Loading Markdown Files

`createPage` can load local Markdown files when a `markdown` node has `props.filePath`. The file content is injected into that node before rendering, while all display control stays on the node props.

```ts
import path from "node:path";
import { createPage, defineSchema } from "@/engine";

export default createPage({
  schema: defineSchema({
    root: {
      type: "section",
      children: [
        {
          type: "markdown",
          props: {
            filePath: path.join(process.cwd(), "data/page/privacy.md"),
            headingColor: "#07111f",
            textColor: "#30475f",
            linkColor: "#12304c",
          },
        },
      ],
    },
  }),
});
```

For simple document-style pages, use the compact Markdown page form:

```ts
import { createPage } from "@/engine";

export default createPage({
  meta: {
    title: "Kastrick Terms of Service",
  },
  title: "Terms of Service — Kastrick",
  description: "Kastrick terms of service.",
  filePath: "@/data/page/tos.md",
  markdown: {
    blockAnimation: "slide-up",
  },
});
```

`filePath` can be absolute, relative to the project working directory, or use the `@/` project-root alias. If both `content` and `filePath` are supplied, loaded file content takes precedence. This feature is server-only, so routes that use local Markdown files should not be marked `"use client"`.

---

---

## defineSchema

Use `defineSchema` to define schemas in separate files with full TypeScript type-checking:

```ts
// schemas/home.schema.ts
import { defineSchema } from "@/engine";

export const HomeSchema = defineSchema({
  meta: { title: "Home" },
  root: { type: "box", children: [] }
});
```

```ts
// app/page.tsx
import { createPage } from "@/engine";
import { HomeSchema } from "@/schemas/home.schema";

export default createPage({ schema: HomeSchema });
```

---

---

## Performance Checklist

Use the optimization that matches the component and route:

- Prefer typed schema props and supported responsive values to ad hoc JavaScript resize logic.
- Use EngineImage, EngineVideo, LazyMount or LazySection when their documented viewport/loading behavior fits the use case.
- Keep schemas and component definitions stable when possible; avoid rebuilding large schema objects during render without a reason.
- Keep event handlers and React state localized to the interaction that needs them.
- Use the StyleCollector according to the Gen 2 styling contract; do not assume provider-collected styles are automatically promoted to global CSS.
- Profile the route, browser and device you care about. Third-party components, context updates, dynamic data and user interactions affect render cost.

Generation 2 does not promise that every node is memoized, every image is automatically converted into next/image, or every subtree receives content-visibility or Suspense.

## Integrating with Next.js App Router

The engine output is a standard React function component. Use it as a default export in any `page.tsx`:

```ts
// app/page.tsx
import { createPage } from "@/engine";
export default createPage({ schema: HomeSchema });
```

For the `<head>` meta tags to work correctly in App Router, the `EngineHead` output needs to be rendered inside a `<head>` element. The simplest approach is to handle `title` and `description` in your `layout.tsx` using `generateMetadata`, and leave the schema meta for supplementary tags only.

---

## Default not-found page

The package exports `DefaultNotFoundPage`, an Engine-rendered 404 page. To wire it explicitly into an App Router project, export it from your app-owned not-found file:

```tsx
// app/not-found.tsx
export { DefaultNotFoundPage as default } from "nextjs-engine";
```

If your app already has its own `app/not-found.tsx`, that app-owned page remains your choice. The exported fallback is a reusable page component, not a command to overwrite an existing route.

---

## Integrating with Next.js Pages Router

```ts
// pages/index.tsx
import { createPage } from "@/engine";
export default createPage({ schema: HomeSchema });
export const getStaticProps = async () => ({ props: {} });
```

---

## Module Aliases

Add this to `tsconfig.json` for clean imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@/engine": ["./src/engine/index.ts"],
      "@/engine/*": ["./src/engine/*"]
    }
  }
}
```

---

---

## Module Aliases

Add this to `tsconfig.json` for clean imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@/engine": ["./src/engine/index.ts"],
      "@/engine/*": ["./src/engine/*"]
    }
  }
}
```

---

---

## Style collection and global CSS

Generation 2 collects generated styles through its StyleCollector/provider flow. Exact CSS blocks can be deduplicated within the collector, but provider-owned CSS is not automatically promoted to a global stylesheet merely because it appears repeatedly.

For the normal page-level appearance, prefer the inline schema theme fields documented above. EngineGlobalStyles emits CSS registered through the explicit global-style path; it does not collect every provider stylesheet.

Low-level imports from src/engine/core/StyleCollector are implementation-level integration points. Application code should prefer the public package exports and the schema theme surface unless it deliberately needs a documented low-level helper.

## cprop — Custom CSS Props

`cprop` exposes pseudo-class states and direct CSS on any engine node.

```ts
{
  type: "card",
  props: {
    cprop: {
      onHover:  { background: "#1a1a2e", transform: "scale(1.02)" },
      onFocus:  { outline: "2px solid var(--e-accent)", outlineOffset: "3px" },
      onActive: { transform: "scale(0.98)", opacity: "0.9" },
      css:      { userSelect: "none", willChange: "transform" },
    }
  }
}
```

### How it works

`onHover`, `onFocus`, and `onActive` are compiled to CSS rules and injected into
`StyleCollector` during render — the same pipeline as all other engine styles.
A hash-based class name (e.g. `e-h-1a2b3c4`) is returned and merged into the
element's `className`. No JavaScript event handlers are used — it is pure CSS.

`cprop.css` is a standard `CSSProperties` object applied as inline style.

### cpropClass utility

```tsx
import { cpropClass } from "@/engine";

// In your own custom components:
function MyComponent({ cprop, className, ...props }) {
  const hoverClass  = cpropClass(cprop);
  const mergedClass = [className, hoverClass].filter(Boolean).join(" ");
  return <div className={mergedClass} {...props} />;
}
```

---

---

## CSS Directly on Prop

Any standard CSS property can be written directly alongside engine shorthands:

```ts
{
  type: "box",
  props: {
    // Engine shorthands
    bg:  "#111",
    px:  "2rem",
    // Direct CSS — just write the property name
    transform:     "rotate(-3deg)",
    filter:        "blur(4px)",
    clipPath:      "polygon(0 0, 100% 0, 100% 80%, 0 100%)",
    mixBlendMode:  "multiply",
    willChange:    "transform",
    animation:     "fadeIn 0.4s ease forwards",
    aspectRatio:   "16/9",
    gridColumn:    "1 / -1",
    userSelect:    "none",
    // Also works as responsive values
    transform:     { xs: "scale(0.9)", md: "scale(1)" },
  }
}
```

### cprop — Engine Custom Properties

`cprop` is strictly for engine-invented concepts (not raw CSS):

```ts
cprop: {
  onHover:     { background: "#1a1a2e", transform: "scale(1.02)" },
  onFocus:     { outline: "2px solid var(--e-accent)", outlineOffset: "3px" },
  onActive:    { transform: "scale(0.97)", opacity: 0.9 },
  onChecked:   { background: "var(--e-accent)" },
  onDisabled:  { opacity: 0.4, cursor: "not-allowed" },
}
```

All pseudo-states are compiled to CSS classes and injected via StyleCollector — no JS event handlers.

---

---

## Schema Validation

```ts
import { validatePageSchema, validateSchema } from "@/engine";

// In your page or CI:
const result = validatePageSchema(mySchema);
// → console.warn in dev for each issue
// → result.valid, result.errors[]

// Validate just a node tree:
const result = validateSchema(mySchema.root);
```

Each `ValidationError` has: `{ path: string, message: string, level: "error" | "warn" }`.

---

---

## Static Schema Analyzer

`schemaAnalyzer` is a build-time / dev-time static analysis tool. Unlike `validateSchema` (which throws on hard errors at runtime), the analyzer collects all diagnostics in one pass and returns them as structured objects — suitable for CI pipelines, editor integrations, or dev-server overlays.

```ts
import { analyzeSchema, isSchemaValid } from "@/engine";

const result = analyzeSchema(MySchema);

console.log(result.formatted);
// [schema:root.children[2]] EngineError(E001): Unknown node type "txt".
//     hint: Did you mean "text"?
// [schema:root.children[5].props] EngineWarn(W001): Image node is missing an "alt" prop.
//     hint: Add alt="" for decorative images or a descriptive string for meaningful ones.

console.log(result.errors);   // number of error-severity diagnostics
console.log(result.warnings); // number of warn-severity diagnostics

// Guard before rendering:
if (!isSchemaValid(MySchema)) throw new Error("Schema has errors");
```

**Diagnostic codes:**

| Code | Severity | Description |
|------|----------|-------------|
| `E001` | error | Unknown node type. Includes "Did you mean X?" via Levenshtein distance. |
| `E002` | error | Missing required prop for a known node type (e.g. `src` on `image`). |
| `E003` | error | Duplicate `id` or `point` value — reports first-seen path. |
| `E004` | error | Circular reference — same object instance appears twice in the tree. |
| `W001` | warn | `image` / `img` node has no `alt` prop (accessibility). |
| `W002` | warn | `button` / `link` has neither `label` nor children (accessibility). |
| `W003` | warn | `checkbox` / `input` has no `id` — cannot be associated with a `<label>`. |
| `W004` | warn | Node has >100 direct children (performance). |
| `W005` | warn | Tree nesting exceeds 15 levels (performance). |
| `W006` | warn | Leaf node (`text`, `image`, `button`, etc.) has children declared — they are silently ignored. |

**`EngineDiagnostic` shape:**

```ts
interface EngineDiagnostic {
  severity: "error" | "warn" | "info";
  code:     string;   // "E001", "W003", etc.
  message:  string;
  path:     string;   // e.g. "root.children[2].children[0]"
  hint?:    string;   // optional fix suggestion
}
```

---

---

## `staticClass` — Deduplicated CSS Classes

`staticClass` converts a `CSSProperties` object into a single CSS class that is injected once into `StyleCollector`. Identical property sets across any number of nodes share the same class name.

```ts
import type { ReactNode } from "react";
import { staticClass, useEngineContext } from "@/engine";

function CustomFrame({ children }: { children: ReactNode }) {
  const { styleCollector } = useEngineContext();
  const layoutClass = staticClass({
    width: "100%",
    maxWidth: "1200px",
    marginLeft: "auto",
    marginRight: "auto",
  }, styleCollector);

  return <div className={layoutClass}>{children}</div>;
}
```

Pass the active provider's `styleCollector` to `staticClass` so the rule is emitted by that page/component's collected stylesheet. Calling `staticClass` without a collector uses the low-level global fallback and is not equivalent to registering global CSS with `EngineGlobalStyles`.

Used internally by `EngineSection` (inner content wrapper) and `EngineCard` (cover + content wrappers) to eliminate repeated inline styles across multiple instances of the same component.

---

---

## Metadata Integration (SEO)

```ts
// app/some-page/page.tsx
import type { Metadata } from "next";
import { generateEngineMetadata } from "@/engine";
import { myPageSchema } from "./schema";

export async function generateMetadata(): Promise<Metadata> {
  return generateEngineMetadata(myPageSchema);
  // or just the meta: generateEngineMetadata({ title: "…", ogImage: "…" })
}

export default createPage(myPageSchema);
```

Generates `title`, `description`, `keywords`, `canonical`, `robots`, `openGraph`, and `twitter` from `PageMeta`.
