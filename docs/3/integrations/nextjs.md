# Next.js Integration

Next.js Engine is designed to run within a Next.js application. The Engine plugin composes its build/runtime integrations into the Next.js configuration.

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

Generation 3 composes API provider/static route compilation, optional NENC setup, EngineDebug, SEO, shader and image/build integration. The `api`, `nenc`, `seo` and `shader` option groups configure those respective systems.

## Server/client boundary

- Keep `nextjs-engine/server` imports inside server-only modules.
- Do not import server filesystem helpers into client components.
- Keep secrets in server environment variables.
- APIStatic route files are public browser programs.
- Use Next.js Route Handlers or NENC for privileged operations.

## Related

- [Engine configuration](../configuration/index.md)
- [Server API](../api/server.md)
- [NE architecture](../ne/architecture.md)
