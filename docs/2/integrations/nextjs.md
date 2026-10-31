# Next.js Integration — Generation 2

Generation 2 integrates with Next.js through the Engine plugin.

~~~js
const withEngine = require("./src/engine/plugins/enginePlugin");

module.exports = withEngine(nextConfig, {
  configDir: ".EngineAPIConfig",
  endpointDir: "data/endpoint",
  staticOutputDir: "public/_static/endpoint"
});
~~~

When using the published package, use its plugin subpath instead of a repository-relative source path. ensureAPIConfig() and filesystem-based configuration loading belong in server/build code. nextjs-engine/server exposes request-aware device detection only on this generation. APIStatic route modules execute in the browser and must not contain secrets or privileged code.

See [Configuration](../configuration/index.md) and [Server API](../api/server.md).
