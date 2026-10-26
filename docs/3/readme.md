# Next.js Engine — Generation 3 Developer Reference

> **GENERATION 3 · ALPHA** · Source branch: main-3. This is the pre-release 3.x contract, not stable Gen 2 documentation.
>
> This is the canonical, versioned Gen 3 developer reference. For existing stable 2.x applications, start at [Generation 2 Documentation](https://github.com/Kate-alt-69/nextjs-engine/blob/main-2/docs/2/index.md). Use the [Gen 3 index](./index.md) to browse all current guides.

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

createPage() is the normal Generation 3 page entry point. A separate Gen 3 page factory is not required. For schemas eligible for server-first rendering, Engine keeps static markup on the server and introduces client islands only where needed. Some legacy named-handler usage still selects the compatibility/provider path; see the [compiler/rendering/runtime guide](./compiler-rendering-runtime.md).

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

- [Gen 3 documentation index](./index.md)
- [Gen 3 overview and server-first model](../gen3/overview.md)
- [Simple styling](./styling.md) and [detailed styling](./styling-detailed.md)
- [EngineTheme, createTheme(), .etr, templates, Data-API and fonts](./engine-components/enginetheme.md)
- [Compiler deep dive](./compiler-deep-dive.md)
- [Runtime and performance](../runtime-performance.md)
- [Schema diagnostics](../schema-diagnostics.md)
- [Versioned component reference](./engine-components/index.md)

## Responsive System

Generation 3 responsive props are resolved to CSS variables and media rules by the shared style compiler. Ordinary responsive styling does not require a JavaScript resize listener or a hydration-time breakpoint hook.

The default named breakpoints are:

| Key | Minimum viewport width |
|---|---:|
| xs | 0px |
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

An EngineConfig can override named breakpoint values with createPage({ config: { breakpoints: { ... } } }). Only the supplied values are changed; the other defaults remain.

A responsive value is either one scalar value or an object keyed by breakpoints:

~~~ts
{
  type: "box",
  props: {
    px: { xs: "1rem", md: "2rem", xl: "3rem" },
    width: { xs: "100%", lg: "70rem" },
    display: { xs: "block", md: "grid" },
  },
}
~~~

The CSS cascade carries a value forward until a later breakpoint overrides it. The compiler does not invent an xs fallback from a value supplied only at md or lg; provide xs when the property needs an explicit first-paint value. Responsive support is property-specific rather than a guarantee that every prop accepts breakpoint objects.

Spacing-like properties that use spacing normalization convert a nonzero numeric value to value divided by 16 rem (for example, 16 becomes 1rem). Numeric values on other CSS properties keep their own property-specific meaning.

For hide/show rules, use the supported hideOn and showOnly props. For styling-only responsive changes, prefer CSS/responsive values over EngineViewport or request-time adaptive compilation. See [simple styling](./styling.md) and [detailed styling internals](./styling-detailed.md).

## Rendering, memoization, and lazy work

The renderer does not promise that every component is wrapped in React.memo, that the full tree becomes immutable after mount, or that a page renders only once. React state, context, route changes, changed props, and client handlers can all cause valid re-renders.

Generation 3 adds compilation and runtime planning for eligible schemas. The plan can classify static/server/client ownership, work priority, required browser features, assets and fallbacks. Static planning may be skipped for dynamic or unsupported source patterns; Next.js still renders such routes normally.

Performance behavior is component-specific:

- Optional/heavier built-ins are split or lazy-loaded where their registry entry declares that behavior.
- EngineImage and EngineVideo have their own viewport/media activation policies; these do not automatically apply to arbitrary image or video elements.
- Responsive style props use CSS media rules rather than a JavaScript resize loop.
- Generated CSS is deduplicated within the owning StyleCollector; this is not a promise of a process-wide stylesheet cache.
- NENC/schema caches use fingerprints and bounded output policies where implemented. Changing a source, dependency or configuration may invalidate affected artifacts.

Profile the actual route and use the [compiler deep dive](./compiler-deep-dive.md) and [runtime/performance guide](../runtime-performance.md) before assuming a particular optimization applies.

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

Most schema nodes accept common layout/style props in addition to the props documented for each node type. The runtime and TypeScript types are the source of truth; not every property listed here applies meaningfully to every component.

| Prop | Type / purpose |
|---|---|
| id, name, point, key | DOM/schema identity, patch targeting, or stable child identity; each has distinct semantics |
| className | Additional CSS class names |
| style | Explicit CSS style object; this has higher precedence than generated style props where the style compiler documents it |
| vars | CSS custom properties applied on the node; standard CSS variable inheritance handles descendants |
| lazy, eager, priority | Lazy/eager hints used only by components/render paths that support them |
| hideOn, showOnly | CSS-responsive visibility rules at named breakpoints |
| m, mt, mr, mb, ml, mx, my | Responsive margin shorthands |
| p, pt, pr, pb, pl, px, py | Responsive padding shorthands |
| w, h, minW, minH, maxW, maxH | Responsive size shorthands |
| width, height, minWidth, minHeight, maxWidth, maxHeight | Long-form sizing aliases where supported |
| bg, background, backgroundColor, color, opacity | Common responsive visual properties |
| border, borderTop, borderBottom, borderLeft, borderRight, borderRadius | Borders and corner radius |
| shadow, boxShadow, transition | Shadow and transition properties |
| position, top, right, bottom, left, zIndex, overflow, cursor | Positioning and interaction-related CSS |
| transform, filter, backdropFilter, clipPath, objectFit, objectPosition, aspectRatio | Common direct CSS props |
| sides, sideDistance, sideType | Per-side margin/padding helper; see the detailed section below |
| onClick | Named handler reference when using the provider/compatibility event path |
| href | Link target consumed by the relevant link-capable component; do not assume every node is automatically wrapped in an anchor |

Responsive support depends on each property's type. See the current source types and [styling guide](./styling.md) before assuming an arbitrary CSS property accepts a breakpoint object.

Spacing and sizing shorthands do not have one universal numeric meaning across all CSS properties. Numeric values on properties using spacing normalization are converted to rem; use explicit CSS strings when the intended CSS unit should be unambiguous.

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

Named handlers are trusted application code passed to createPage or createComponent and referenced from schema props by name:

~~~tsx
import { createPage } from "nextjs-engine";
import { HomeSchema } from "./schema";

export default createPage({
  schema: HomeSchema,
  handlers: {
    trackCta: () => analytics.track("cta_clicked"),
  },
});
~~~

~~~ts
{
  type: "button",
  props: { label: "Continue", onClick: "trackCta" },
}
~~~

Important Generation 3 behavior: a non-empty named-handler map selects the provider/legacy renderer path for that page/component instead of the server-first renderer. Keep handlers for interactions that actually need them; prefer narrow client React components/slots for client state rather than making an otherwise static schema depend on a broad handler map. The schema stores handler names, not handler source code. A module-level createPage call does not automatically have access to state local to an unrelated parent React component.

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

The current EngineTheme guide documents group IDs, inheritance, .etr generation/loading, templates, font compilation and the Data-API: [EngineTheme reference](./engine-components/enginetheme.md).

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

A schema node can then use `type: "pricing-card"` with the serializable props and children that `PricingCard` expects. The current schema validator checks general node/props shape and selected built-in requirements; it does not validate custom props against the component's TypeScript interface at runtime. Validate custom input yourself when its source is not trusted.

createComponent({ schema }) currently composes a schema tree into a reusable React component. It is not yet the planned advanced custom-React-component factory described in [the Gen 3 plan](../../plan.md#14-custom-ui-components-registry-integration-and-enginetheme-bindings). Keep using the implemented registerComponent() contract for custom React node types until that planned mode is implemented and documented.

## createPage API

Generation 3 createPage accepts three shapes:

1. A full PageSchema through the schema option.
2. Direct schema fields such as meta, theme and root.
3. A compact Markdown-page shape with filePath, optional inline content, markdown props, optional theme, and optional section props.

~~~tsx
import { createPage, defineSchema } from "nextjs-engine";

const homeSchema = defineSchema({
  meta: { title: "Home", description: "Welcome." },
  root: {
    type: "section",
    children: [
      { type: "heading", props: { content: "Home" } },
      { type: "text", props: { content: "Built with Next.js Engine." } },
    ],
  },
});

export default createPage({ schema: homeSchema });
~~~

Direct-schema form:

~~~ts
export default createPage({
  meta: { title: "Privacy Policy" },
  root: { type: "markdown", props: { content: "# Privacy Policy" } },
});
~~~

Compact Markdown-file form:

~~~ts
export default createPage({
  title: "Privacy Policy",
  description: "How the site handles data.",
  filePath: "./data/privacy.md",
  markdown: { headingColor: "#07111f", linkColor: "#12304c" },
});
~~~

The page options can also include config, slots, mobile/tablet adaptive configuration and compiler controls. The createPage Markdown file form reads local files on the server/build path; it is not a browser URL loader. If handlers is a non-empty object, the current implementation uses the provider/compatibility renderer rather than server-first rendering. For App Router metadata, use Next.js generateMetadata with generateEngineMetadata, shown below.

## createComponent API

createComponent creates a reusable React component from a schema-backed page definition. It accepts the full-schema form or direct schema fields; it does not accept createPage's compact filePath Markdown-page form.

~~~tsx
import { createComponent, defineSchema } from "nextjs-engine";

const SiteChrome = createComponent({
  schema: defineSchema({
    root: {
      type: "box",
      children: [
        { type: "section", children: [] },
        { type: "slot", props: { name: "sidebar" } },
        { type: "slot", props: { name: "children" } },
      ],
    },
  }),
});

export default SiteChrome;
~~~

The returned component accepts runtime slots and children:

~~~tsx
<SiteChrome slots={{ sidebar: <Sidebar /> }}>
  <MainContent />
</SiteChrome>
~~~

Named slots are injected through the schema slot nodes. This is the existing schema-composition API; the advanced custom React component authoring mode through createComponent remains a separate planned enhancement and should not be presented as implemented.

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

Next.js App Router does not build page metadata from meta tags emitted in the React body. Export generateMetadata from the route and convert the same PageSchema to Next.js Metadata:

~~~tsx
import type { Metadata } from "next";
import { createPage, generateEngineMetadata } from "nextjs-engine";
import { HomeSchema } from "./schema";

export function generateMetadata(): Metadata {
  return generateEngineMetadata(HomeSchema);
}

export default createPage({ schema: HomeSchema });
~~~

Use the same schema for rendering and metadata when practical so the title, description, canonical URL, robots and social preview values stay consistent. The helper accepts either a PageSchema or PageMeta. For richer site/social/structured-data handling, see the EngineSEO component guide.

## Integrating with Next.js Pages Router

~~~tsx
// pages/index.tsx
import { createPage } from "nextjs-engine";
import { HomeSchema } from "../schemas/home";

export default createPage({ schema: HomeSchema });

export const getStaticProps = async () => ({ props: {} });
~~~

This is the Pages Router compatibility path. The App Router generateMetadata function documented above does not apply to Pages Router; use Next.js Head or the metadata mechanisms supported by that router.

## Optional repository-local module aliases

These aliases are conveniences for working inside the repository. Applications consuming the published package should import from nextjs-engine and do not need this mapping.

Add this to tsconfig.json for clean imports:

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

For custom component-scoped styles, see [the detailed Gen 3 styling guide](./styling-detailed.md). EngineGlobalStyles only emits CSS explicitly registered through the global-style path; it does not gather all provider styles.

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
      // Put raw CSS properties on style or on supported node props, not inside cprop.
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

## CSS Directly on Prop

The schema type exposes many common CSS properties directly alongside Engine shorthands. For properties not included in the node's TypeScript props, use the style object, which accepts the supported React CSS style shape plus Engine's nested at-rule form. Do not assume every browser CSS property is a top-level schema prop.

~~~ts
{
  type: "box",
  props: {
    bg: "#111",
    px: "2rem",
    filter: "blur(4px)",
    clipPath: "polygon(0 0, 100% 0, 100% 80%, 0 100%)",
    mixBlendMode: "multiply",
    willChange: "transform",
    animation: "fadeIn 0.4s ease forwards",
    aspectRatio: "16/9",
    gridColumn: "1 / -1",
    userSelect: "none",
    transform: { xs: "rotate(-3deg)", md: "rotate(0deg)" },
    style: {
      "@supports (backdrop-filter: blur(1px))": {
        backdropFilter: "blur(8px)",
      },
    },
  },
}
~~~

Do not repeat a property key in one object literal; a later duplicate overwrites the earlier value and TypeScript may reject it.

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

## Schema Validation

Use validateSchema for a node tree or validatePageSchema for a full PageSchema:

~~~ts
import { validatePageSchema, validateSchema } from "nextjs-engine";

const pageResult = validatePageSchema(mySchema);
if (!pageResult.valid) {
  console.error(pageResult.errors);
}

const rootResult = validateSchema(mySchema.root);
~~~

Both functions return a structured ValidationResult with valid and errors. In development, validatePageSchema also prints reported issues to the console. These functions do not throw solely because the returned result contains validation errors; callers decide whether to stop a build/test based on result.valid. For richer aggregated diagnostics and suggestions, use the static schema analyzer below.

## Static Schema Analyzer

The exported analyzer gathers schema diagnostics in one pass and returns structured objects suitable for CI, editor integrations and debugging:

~~~ts
import { analyzeSchema, analyzeNode, isSchemaValid } from "nextjs-engine";

const result = analyzeSchema(MySchema);
console.log(result.formatted);
console.log(result.diagnostics);
console.log({ errors: result.errors, warnings: result.warnings });

const nodeResult = analyzeNode(MySchema.root);
if (!isSchemaValid(MySchema)) {
  throw new Error("The page schema has analyzer errors.");
}
~~~

AnalyzerResult contains diagnostics, error and warning counts, and a formatted report. Diagnostic families include unknown node types, malformed/circular or reused node objects, required props, duplicate navigation targets/names, accessibility hints, excessive nesting/child counts, and orphaned EngineScroll point metadata. Codes and hints are part of diagnostics, not a promise that every warning is a runtime exception.

This is separate from validateSchema/validatePageSchema, which return a simpler valid/errors result, and from the Gen 3 compilePage diagnostics and fallback plan documented in the [compiler deep dive](./compiler-deep-dive.md).

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

## Metadata Integration (SEO)

```ts
// app/some-page/page.tsx
import type { Metadata } from "next";
import { createPage, generateEngineMetadata } from "nextjs-engine";
import { myPageSchema } from "./schema";

export async function generateMetadata(): Promise<Metadata> {
  return generateEngineMetadata(myPageSchema);
  // or just the meta: generateEngineMetadata({ title: "…", ogImage: "…" })
}

export default createPage({ schema: myPageSchema });
```

Generates `title`, `description`, `keywords`, `canonical`, `robots`, `openGraph`, and `twitter` from `PageMeta`.
