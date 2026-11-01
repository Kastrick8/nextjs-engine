# Next.js Integration

Next.js Engine is designed to run within a Next.js application. The Engine plugin composes its build/runtime integrations into the Next.js configuration. It does not replace the App Router, ordinary React components, server data access, or your authentication provider.

## Source-checkout setup

The repository's own configuration uses:

```js
const withEngine = require("./src/engine/plugins/enginePlugin");

const nextConfig = {
  reactStrictMode: true,
  distDir: "dist"
};

module.exports = withEngine(nextConfig, {
  // Optional configuration groups:
  // api: { ... },
  // nenc: { ... },
  // seo: { ... },
  // shader: { ... }
});
```

The installed package's plugin entrypoint can differ from a source checkout. Use the entrypoint shipped by the exact installed package version; do not assume repository-relative `src/` paths exist in a consumer project.

## Plugin responsibilities

Generation 3 composes API provider/static route compilation, optional NENC setup, EngineDebug, SEO, shader and image/build integration. The `api`, `nenc`, `seo` and `shader` option groups configure those respective systems. NENC is opt-in; it is not enabled merely because EngineAPIResolver or APIStatic is present.

## Keep ordinary React/Next.js code

You can retain conventional Server Components, Client Components, route handlers, layouts, native HTML, application state and third-party React components. Use `createPage()` for an Engine-schema route and `createComponent()` to embed an Engine schema region into normal JSX. Gen 3 also adds `createComponent({ mode: "custom" })` for trusted local React components used as schema nodes.

See [React and JSX integration](./react-and-jsx.md) for full examples and the SSR/style-collection boundary.

## Server/client boundary

- Keep `nextjs-engine/server` imports inside server-only modules.
- Do not import server filesystem helpers into client components.
- Keep secrets in server environment variables.
- APIStatic route files are public browser programs and are not account-protected endpoints.
- Use Next.js Route Handlers or opt-in NENC for privileged operations; enforce user identity and permission checks on the server.

See [Authentication and authorization](./authentication-and-authorization.md), [Third-party libraries](./third-party.md), [Engine configuration](../configuration/index.md), [Server API](../api/server.md), and [NE architecture](../ne/architecture.md).
