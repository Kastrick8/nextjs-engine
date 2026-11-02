# React, JSX, and ordinary Next.js applications — Generation 2

> **Generation 2 · Stable 2.x** · This guide describes the public contract on `main-2`.

Next.js Engine is an additive React/Next.js library. It does **not** require you to rewrite an application as schema files, replace the App Router, or stop writing ordinary JSX/TSX. Keep normal React components, HTML elements, hooks, forms, Server Components, Client Components, CSS, and other libraries. Use Engine where its schema renderer or components are useful.

## Keep normal Next.js pages

An ordinary App Router page remains an ordinary React component:

```tsx
// app/dashboard/page.tsx
import { DashboardFilters } from "@/components/dashboard-filters";
import { ExistingRevenueChart } from "@/components/revenue-chart";
import { EngineSummary } from "@/components/engine-summary";
import { getDashboardData } from "@/lib/dashboard";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main>
      <h1>Dashboard</h1>
      <DashboardFilters />
      <ExistingRevenueChart data={data.revenue} />
      <EngineSummary />
    </main>
  );
}
```

`DashboardFilters`, `ExistingRevenueChart`, data access, forms, and the surrounding markup are regular application code. `EngineSummary` is an Engine-created React component, shown below. You can mix these approaches in one route and across a project.

## Embed a schema-rendered Engine region in JSX

Use the public `createComponent()` factory when you want a self-contained schema-rendered region inside an otherwise conventional React tree:

```tsx
// components/engine-summary.tsx
import { createComponent } from "nextjs-engine";

export const EngineSummary = createComponent({
  schema: {
    root: {
      type: "card",
      props: { p: "1.25rem", gap: "0.75rem" },
      children: [
        { type: "heading", props: { level: 2, content: "Account overview" } },
        { type: "text", props: { content: "This section is rendered by Engine." } },
      ],
    },
  },
});
```

`createComponent()` returns a React component. Render it with normal JSX, pass ordinary React children/slots where the schema declares a slot, and keep the rest of the route in React. The Gen 2 implementation creates the Engine provider and emits the generated styles for this factory-managed component.

A full schema page is also just a React page component:

```tsx
// app/engine-page/page.tsx
import { createPage, defineSchema } from "nextjs-engine";

const schema = defineSchema({
  root: {
    type: "section",
    children: [
      { type: "heading", props: { content: "An Engine page" } },
      { type: "text", props: { content: "A schema tree rendered by Engine." } },
    ],
  },
});

export default createPage({ schema });
```

Use `createPage()` when the whole route should be schema-driven. Use `createComponent()` when you want to compose an Engine-owned region into a normal React page.

## Use Engine's React components in JSX

The root entrypoint also exports React components such as `EngineCanvas`, `EngineMarkdown`, `EngineImage`, `EngineVideo`, `EngineDialog`, `EngineDrawer`, and `EnginePopover`. Their module references include JSX examples and the props for each component.

For example, a browser-driven canvas belongs in a Client Component:

```tsx
// components/animated-surface.tsx
"use client";

import { EngineCanvas } from "nextjs-engine";

export function AnimatedSurface() {
  return (
    <EngineCanvas
      mode="2d"
      style={{ width: "100%", height: 320 }}
      onSetup={(context) => {
        if ("fillStyle" in context) context.fillStyle = "#0f172a";
      }}
      onDraw={(context, canvas) => {
        if (!("fillRect" in context)) return false;
        context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        context.fillRect(20, 20, 120, 80);
        return false;
      }}
    />
  );
}
```

Follow the module's documented server/client requirements. A component that uses browser APIs, event handlers, or React state must live behind a Client Component boundary.

> **Style-collection boundary:** `EngineProvider` is a public context provider, but it does not by itself render the provider's collected CSS. The internal `EngineCollectedStyles` component is not exported from the public `nextjs-engine` root entrypoint. For a self-contained schema region with automatic style collection, use `createComponent()` rather than importing private implementation paths. Do not assume that wrapping arbitrary components in `EngineProvider` alone is a complete SSR stylesheet integration.

## Existing React and third-party libraries

You can keep using normal React packages and components. Place them next to Engine-rendered components in the tree, pass serializable props across Server/Client Component boundaries, and keep browser-only packages in Client Components. Engine's registry can also register a trusted React component for use as a custom schema node; see [Custom components](../module/engine-custom-components.md).

The Engine Next.js plugin composes with your existing Next.js configuration. It is an integration layer, not a replacement for your app's routes, layouts, data access, or styling system. See [Next.js integration](./nextjs.md) and [Third-party libraries](./third-party.md).

## Which rendering style should I choose?

| Need | Use |
|---|---|
| A conventional route with custom React state/data/forms | Normal Next.js page and React components |
| Reusable schema-driven UI inside normal JSX | `createComponent()` |
| A route whose content is primarily an Engine schema | `createPage()` |
| A trusted React component used as a schema node | `registerComponent()` and the [custom component guide](../module/engine-custom-components.md) |
| A documented Engine React feature such as Canvas or Overlay | The component's JSX API and its module-specific client/server guidance |

Related references: [Create API](../api/create.md) · [EngineProvider](../module/engine-provider.md) · [Modules](../module/index.md) · [Third-party libraries](./third-party.md)
