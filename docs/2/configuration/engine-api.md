# Configure EngineAPIResolver

EngineAPIResolver performs normal HTTP requests and can dispatch to APIStatic descriptors. Provider files under .EngineAPIConfig are separate from APIStatic source files.

## 1. Provider config

~~~text
.EngineAPIConfig/
└── main.api
~~~

~~~ini
[provider.main]
endpoint = "https://api.example.com&V1&"
method = "POST"
cache = "no-store"
headers = "{\"Accept\":\"application/json\"}"

[provider.main.auth]
type = "bearer"
token = "${API_TOKEN}"

[versions]
V1 = "/api/v1"
~~~

The parser reads .api files in sorted filename order. Both $NAME and ${NAME} environment-variable forms are expanded while configuration is compiled/loaded.

## 2. Next.js plugin setup

Generation 2 writes .engine-api-compiled.json by default and compiles static endpoints beneath public/_static/endpoint.

~~~js
const withEngine = require("./src/engine/plugins/enginePlugin");

module.exports = withEngine(nextConfig, {
  configDir: ".EngineAPIConfig",
  outputFile: ".engine-api-compiled.json",
  endpointDir: "data/endpoint",
  staticOutputDir: "public/_static/endpoint",
  staticManifestFile: "manifest.json"
});
~~~

When using a published package, use its plugin subpath instead of the source-checkout path:

~~~js
const withEngineAPI = require("nextjs-engine/plugin");
module.exports = withEngineAPI(nextConfig, {
  configDir: ".EngineAPIConfig",
  outputFile: ".engine-api-compiled.json"
});
~~~

The Engine plugin compiles when Next.js evaluates its configuration and watches existing .api and .route source directories during development.

## 3. Load a provider

~~~ts
import { ensureAPIConfig, EngineAPIResolver } from "nextjs-engine";

const compiled = await ensureAPIConfig();
const provider = compiled.providers.main;
if (!provider) throw new Error("Missing provider.main");

const resolver = new EngineAPIResolver({
  ...provider,
  versionMacros: compiled.versions
});

const response = await resolver.resolveRequest({
  formData: { name: "Example" }
});
if (!response.ok) throw new Error(`Request failed: ${response.status}`);
~~~

ensureAPIConfig() may read local files and environment variables. Call it from server/build code, never from a browser component.

## Authentication

| Type | Required fields | Behavior |
|---|---|---|
| none | None | No auth header |
| ak | key | Configurable API-key header |
| bearer, jwt | token | Bearer authorization |
| basic | username, password | Basic authorization |
| hmac | secret | Timestamped HMAC signature |
| pnp | privateKey | Timestamped asymmetric signature |

HMAC supports SHA-256/SHA-512; PNP supports Ed25519/RS256. Required credentials fail closed when missing or empty.

> [!WARNING]
> Never commit live credentials to .api files. Keep them in environment variables available to the server/build process. HMAC and PNP cannot sign browser-generated multipart FormData bodies; use JSON or a suitable non-signing mode.

## Overrides and macros

Resolver config layers merge constructor/global config → pageOverrides → nodeOverrides. Version macros use &NAME& tokens and are replaced before fetch(). The endpoint is an atomic routing field: a later endpoint replaces the earlier endpoint as a whole.

See [EngineAPIResolver module](../module/engineapi.md) and [APIStatic configuration](./api-static.md).
