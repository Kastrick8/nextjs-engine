# React, JSX, and ordinary Next.js applications — Generation 3

> **Generation 3 · Alpha** · This guide describes the public contract on `main-3`.

Next.js Engine is an additive React/Next.js rendering layer. You can keep ordinary App Router pages, Server Components, Client Components, JSX/TSX, native HTML, hooks, application state, forms, CSS, and third-party components. You do not have to convert an entire application into Engine schemas.

Generation 3 adds a compiler-first/server-first Engine page path; it does not replace the framework's own React component model.

## Keep conventional Next.js routes and components

A normal App Router page can fetch data and compose ordinary components with a schema-rendered Engine component:

```tsx
// app/dashboard/page.tsx
import { ExistingChart } from "@/components/existing-chart";
import { DashboardFilters } from "@/components/dashboard-filters";
import { EngineSummary } from "@/components/engine-summary";
import { getDashboardData } from "@/lib/dashboard";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main>
      <h1>Dashboard</h1>
      <DashboardFilters />
      <ExistingChart data={data.revenue} />
      <EngineSummary />
    </main>
  );
}
```

The page, filters, chart, data access, and surrounding markup remain normal React/Next.js code. Engine owns only the region represented by `EngineSummary`.

## Embed an Engine schema component in normal JSX

Use `createComponent()` to create a reusable React component from a schema:

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
        { type: "text", props: { content: "This region is rendered by Engine." } },
      ],
    },
  },
});
```

Generation 3's default eligible path compiles and renders this component through the server-first engine renderer. Use it from a normal **Server Component** tree, such as an App Router page. Do not import it directly into a `"use client"` module: the server-first implementation belongs on the server side of the React Server Component boundary. When a Client Component needs to display or surround the result, compose it in a Server Component and pass the rendered element through a supported `children`/slot prop, following Next.js Server/Client Component rules. A component with named `handlers` uses the compatibility renderer; an explicit scoped registry requires server-first rendering and will throw if the page/component is forced onto the legacy renderer.

Use `createPage()` when the complete route should be schema-driven. Use `createComponent()` when the schema should be one component inside a normal application route.

## Use Engine React components in JSX

The public root entrypoint also exports React components such as `EngineCanvas`, `EngineMarkdown`, `EngineImage`, `EngineVideo`, `EngineDialog`, `EngineDrawer`, and `EnginePopover`. Their module references describe component props and JSX usage.

Browser-driven features belong in Client Components:

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
        if (!("clearRect" in context) || !("fillRect" in context)) return false;
        context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        context.fillRect(20, 20, 120, 80);
        return false;
      }}
    />
  );
}
```

Continue to use native React state, event handlers, form libraries, and HTML around Engine components. Mark a file `"use client"` when it needs hooks, browser APIs, or client event handlers; keep database and private credential access in server-only modules.

## Trusted React components inside Engine schemas

Generation 3's `createComponent({ mode: "custom" })` creates a trusted adapter for an application-owned React component. Register the adapter under its declared ID, then reference that type from schema nodes:

```tsx
import { createComponent, registerComponent } from "nextjs-engine";
import { StatusBadgeView } from "./status-badge-view";

const StatusBadge = createComponent({
  mode: "custom",
  id: "status-badge",
  component: StatusBadgeView,
  props: {
    status: {
      type: "string",
      required: true,
      enum: ["ready", "pending", "failed"],
    },
  },
  slots: ["children"],
  strictProps: true,
});

registerComponent("status-badge", StatusBadge);
```

Keep executable React components in trusted local application code. EngineTheme remote artifacts are declarative data; they do not deliver executable components. See [Custom Engine Components](../module/engine-custom-components.md) and [Component Registry API](../api/component-registry.md).

## Provider and collected-style boundary

`EngineProvider` is a public context provider for hooks/config/slots/handlers. It does not itself emit the provider's collected stylesheet. `createPage()` and the schema-backed `createComponent()` factory manage their own Engine rendering and collected-style path.

The internal `EngineCollectedStyles` implementation is not exported from the public `nextjs-engine` root entrypoint. For a self-contained schema region, prefer `createComponent()` rather than importing private implementation paths or assuming that `EngineProvider` alone completes SSR style emission. See [EngineProvider](../module/engine-provider.md) and [detailed styling](../styling-detailed.md).

## Keep third-party libraries

Existing React UI kits, charts, form packages, data clients, CSS Modules, Tailwind utilities, and custom application components can coexist with Engine. Use the Next.js plugin to add Engine build integrations to your existing config; do not replace the framework's layouts, routes, server data layer, or application authentication system.

See [Next.js integration](./nextjs.md), [Third-party libraries](./third-party.md), and [Authentication and authorization](./authentication-and-authorization.md).

## Which composition path should I use?

| Need | Use |
|---|---|
| Conventional route with application state/data/forms | Normal Next.js page and React components |
| Schema-rendered region embedded in ordinary JSX | `createComponent()` |
| Full Engine schema route with compiler/server-first path | `createPage()` |
| Existing trusted React component represented as a schema node | `createComponent({ mode: "custom" })` plus registration |
| Public Engine React feature such as Canvas or Overlay | Its root export and module-specific JSX/client guidance |

Framework references: [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) · [React Server Components](https://react.dev/reference/rsc/server-components)
