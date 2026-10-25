# Next.js Engine — Generation 3 Developer Reference

> **GENERATION 3 · ALPHA** · Source branch: main-3. This is the pre-release 3.x contract, not stable Gen 2 documentation.
>
> For existing stable 2.x applications, start at [Generation 2 Documentation](./2/index.md). For the full current Gen 3 guide map, use the [Gen 3 index](./3/index.md).

## What it is

Next.js Engine is a schema-driven React/Next.js runtime. A page is described with a typed PageSchema; Engine can validate it, compile an execution plan, render server-owned output where possible, and reserve client code for interactions that require the browser.

These are capabilities with specific boundaries, not blanket guarantees that every element is memoized, lazy-loaded, or rendered exactly once. Dynamic schemas, named-handler APIs, third-party components, and client state can follow different paths.

## Generation 3 rendering model

~~~text
PageSchema
    ↓
compilePage()
    ├─ runtime ownership: static / server / client
    ├─ work classes and used-feature manifest
    ├─ browser fallback plan
    ├─ asset graph and diagnostics
    ↓
EngineServerRenderer
    ↓
small client islands only where browser behavior is required
    ↓
EngineScheduler + EngineViewport + EngineModel
~~~

createPage() is the normal Generation 3 page entry point. A separate Gen 3 page factory is not required. For schemas eligible for server-first rendering, Engine keeps static markup on the server and introduces client islands only where needed. Some legacy named-handler usage still selects the compatibility/provider path; see the [compiler/rendering/runtime guide](./3/compiler-rendering-runtime.md).

## Quick start

~~~tsx
import { createPage, defineSchema } from "nextjs-engine";

const schema = defineSchema({
  meta: { title: "Home" },
  root: {
    type: "section",
    children: [
      { type: "heading", props: { content: "Hello from Engine" } },
      { type: "text", props: { content: "A typed schema rendered by Next.js." } },
    ],
  },
});

export default createPage({ schema });
~~~

## Documentation map

- [Gen 3 documentation index](./3/index.md)
- [Gen 3 overview and server-first model](./gen3/overview.md)
- [Simple styling](./3/styling.md) and [detailed styling](./3/styling-detailed.md)
- [EngineTheme, createTheme(), .etr, templates, Data-API and fonts](./3/engine-components/enginetheme.md)
- [Compiler deep dive](./3/compiler-deep-dive.md)
- [Runtime and performance](./runtime-performance.md)
- [Schema diagnostics](./schema-diagnostics.md)
- [Versioned component reference](./3/engine-components/)

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



## Rendering, memoization, and lazy work

The renderer does not promise that every component is wrapped in React.memo, that the full tree becomes immutable after mount, or that a page renders only once. React state, context, route changes, changed props, and client handlers can all cause valid re-renders.

Generation 3 adds compilation and runtime planning for eligible schemas. The plan can classify static/server/client ownership, work priority, required browser features, assets and fallbacks. Static planning may be skipped for dynamic or unsupported source patterns; Next.js still renders such routes normally.

Performance behavior is component-specific:

- Optional/heavier built-ins are split or lazy-loaded where their registry entry declares that behavior.
- EngineImage and EngineVideo have their own viewport/media activation policies; these do not automatically apply to arbitrary image or video elements.
- Responsive style props use CSS media rules rather than a JavaScript resize loop.
- Generated CSS is deduplicated within the owning StyleCollector; this is not a promise of a process-wide stylesheet cache.
- NENC/schema caches use fingerprints and bounded output policies where implemented. Changing a source, dependency or configuration may invalidate affected artifacts.

Profile the actual route and use the [compiler deep dive](./3/compiler-deep-dive.md) and [runtime/performance guide](./runtime-performance.md) before assuming a particular optimization applies.

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

Generation 3 keeps the backward-compatible inline PageSchema.theme form and adds the reusable, validated createTheme() API. Use inline theme properties for a page-specific setup; use createTheme() when shared tokens, Markdown component defaults, variants or explicit remote artifacts are needed.

~~~ts
import { createTheme } from "nextjs-engine";

export const docsTheme = createTheme({
  id: "docs",
  scope: "global",
  tokens: { colors: { accent: "#826f9b", surface: "#241b38" } },
  markdown: {
    defaults: { linkColor: "var(--e-theme-colors-accent)", codeBackground: "#241b38" },
    variants: { dark: { defaults: { codeColor: "#f5efff" } } },
  },
});
~~~

A schema can reference a registered global theme variant:

~~~ts
const schema = defineSchema({
  theme: { id: "docs.markdown.dark" },
  root: { type: "markdown", props: { content: "# Themed docs" } },
});
~~~

The current EngineTheme guide documents group IDs, inheritance, .etr generation/loading, templates, font compilation and the Data-API: [EngineTheme reference](./3/engine-components/enginetheme.md).

**Current limitation:** the EngineTheme pipeline is implemented, but the runtime applies component-specific defaults/styles to Markdown today. Do not assume a components.dialog, components.drawer, components.popover, or arbitrary custom-component namespace automatically styles those components yet. In particular, EngineOverlay theme bindings remain planned work. Page-level vars, supported fonts, and globalStyles remain separate compatibility features.

Legacy inline theme values remain supported:

~~~ts
const schema = defineSchema({
  theme: {
    vars: { "--docs-accent": "#826f9b" },
    globalStyles: ".docs-article { max-width: 72rem; }",
  },
  root: { type: "markdown", props: { content: "# Legacy inline theme" } },
});
~~~

## Custom Components

Trusted local React components can be registered as schema node types with registerComponent(). This is the existing low-level custom-node API:

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

A schema node can then use type: pricing-card with validated, serializable props and children.

createComponent({ schema }) currently composes a schema tree into a reusable React component. It is not yet the planned advanced custom-React-component factory described in [the Gen 3 plan](../plan.md#14-custom-ui-components-registry-integration-and-enginetheme-bindings). Keep using the implemented registerComponent() contract for custom React node types until that planned mode is implemented and documented.

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
import { createPage, defineSchema } from "nextjs-engine";

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
import { createPage } from "nextjs-engine";

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
import { defineSchema } from "nextjs-engine";

export const HomeSchema = defineSchema({
  meta: { title: "Home" },
  root: { type: "box", children: [] }
});
```

```ts
// app/page.tsx
import { createPage } from "nextjs-engine";
import { HomeSchema } from "@/schemas/home.schema";

export default createPage({ schema: HomeSchema });
```

---

---

## Performance Checklist

Use the optimization that matches the actual component and route:

- Prefer server-first createPage() for schemas that qualify; keep browser-only behavior in narrow client components.
- Use typed schema nodes and supported responsive values so styling does not require a resize listener.
- Use EngineImage/EngineVideo and their documented loading controls when their viewport-aware behavior is needed.
- Use lazy-mounted/deferred components only where the corresponding Engine component supports that lifecycle.
- Keep createTheme() definitions static and reusable; remote .etr loading is explicit and is not performed automatically during rendering.
- Use the compiler/runtime reports and bundle budgets to confirm what compiled, which islands/assets are produced, and which work can be deferred.
- Profile real routes. Third-party/custom React components, context updates, event handlers and dynamic schema construction can change render cost.

Do not assume every element is memoized, every image automatically becomes next/image, every subtree gets content-visibility, or every page stays permanently render-free after mount.

## Integrating with Next.js App Router

The engine output is a standard React function component. Use it as a default export in any `page.tsx`:

```ts
// app/page.tsx
import { createPage } from "nextjs-engine";
export default createPage({ schema: HomeSchema });
```

For the `<head>` meta tags to work correctly in App Router, the `EngineHead` output needs to be rendered inside a `<head>` element. The simplest approach is to handle `title` and `description` in your `layout.tsx` using `generateMetadata`, and leave the schema meta for supplementary tags only.

---

## Integrating with Next.js Pages Router

```ts
// pages/index.tsx
import { createPage } from "nextjs-engine";
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

Generation 3 collects generated style rules through the nearest EngineProvider / StyleCollector boundary. Exact CSS blocks are deduplicated within that collector. Provider-collected styles are not automatically promoted into a process-global stylesheet, and the collector is not a cross-request cache.

For page-wide theme variables and styles, prefer the supported PageSchema.theme fields or createTheme() from nextjs-engine. This keeps the theme attached to the page and avoids importing the package's private implementation modules.

~~~ts
import { defineSchema } from "nextjs-engine";

export const schema = defineSchema({
  theme: {
    vars: { "--brand": "#9bcf3a" },
    globalStyles: "body { color: var(--brand); }",
  },
  root: { type: "section", children: [] },
});
~~~

For custom component-scoped styles, see [the detailed Gen 3 styling guide](./3/styling-detailed.md). EngineGlobalStyles only emits CSS explicitly registered through the global-style path; it does not gather all provider styles.

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
import { cpropClass } from "nextjs-engine";

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
import { validatePageSchema, validateSchema } from "nextjs-engine";

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
import { analyzeSchema, isSchemaValid } from "nextjs-engine";

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
import { staticClass, useEngineContext } from "nextjs-engine";

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
import { generateEngineMetadata } from "nextjs-engine";
import { myPageSchema } from "./schema";

export async function generateMetadata(): Promise<Metadata> {
  return generateEngineMetadata(myPageSchema);
  // or just the meta: generateEngineMetadata({ title: "…", ogImage: "…" })
}

export default createPage(myPageSchema);
```

Generates `title`, `description`, `keywords`, `canonical`, `robots`, `openGraph`, and `twitter` from `PageMeta`.
