# Next.js Integration — Generation 2

Generation 2 integrates with Next.js through the Engine plugin. The plugin composes Engine build integration into your existing Next.js configuration; it does not replace the App Router, your layouts, data layer, or ordinary React components.

~~~js
const withEngine = require("./src/engine/plugins/enginePlugin");

module.exports = withEngine(nextConfig, {
  configDir: ".EngineAPIConfig",
  endpointDir: "data/endpoint",
  staticOutputDir: "public/_static/endpoint"
});
~~~

When using the published package, use the plugin entrypoint shipped by the installed package instead of a repository-relative source path. `ensureAPIConfig()` and filesystem-based configuration loading belong in server/build code.

## Use normal React and JSX

You can keep ordinary App Router pages, Server Components, Client Components, HTML, hooks, application state, form libraries, and existing React packages. Use `createComponent()` to embed a schema-rendered Engine region inside normal JSX; use `createPage()` when a complete route should be schema-driven.

~~~tsx
// app/dashboard/page.tsx
import { DashboardFilters } from "@/components/dashboard-filters";
import { AccountSummary } from "@/components/account-summary";

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <DashboardFilters />
      <AccountSummary />
      <p>This is ordinary React markup.</p>
    </main>
  );
}
~~~

See [React and JSX integration](./react-and-jsx.md) for complete examples and the distinction between a schema component and a conventional React component.

## Server and browser boundaries

The `nextjs-engine/server` entrypoint in Gen 2 exposes request-aware device detection and related device types. Keep filesystem helpers and private environment values in server/build code. APIStatic route modules execute in the browser and must not contain secrets or privileged code. Authentication and account authorization must be enforced by an application-owned server endpoint or private backend; see [Authentication and authorization](./authentication-and-authorization.md).

> **Gen 3 migration notice:** Gen 3 changes the default eligible page path to compiler-first/server-first rendering, adds `nextjs-engine/network` and `nextjs-engine/seo`, and expands the `/server` entrypoint. These subpaths and named exports do not exist in Gen 2 and will fail module/export resolution here. See the [Gen 2 → Gen 3 migration guide](../migration-to-gen3.md).

See [Configuration](../configuration/index.md), [Server API](../api/server.md), [React/JSX integration](./react-and-jsx.md), and [Third-party libraries](./third-party.md).
