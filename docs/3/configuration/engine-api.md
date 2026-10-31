# Configure EngineAPIResolver — Generation 3

EngineAPIResolver handles external HTTP requests and may dispatch to APIStatic descriptors. Provider files under `.EngineAPIConfig` are distinct from APIStatic `.route` files.

## 1. Create provider configuration

~~~text
.EngineAPIConfig/
└── catalog.api
~~~

~~~ini
[provider.catalog]
endpoint = "https://api.example.com&V1&"
method = "POST"
cache = "no-store"
headers = "{\"Accept\":\"application/json\"}"

[provider.catalog.auth]
type = "bearer"
token = "${CATALOG_API_TOKEN}"

[versions]
V1 = "/api/v1"
~~~

The parser reads sorted `.api` files. Supported sections are `[provider.NAME]`, `[provider.NAME.auth]` and `[versions]`. Lines use `key=value`; `#` starts a comment. Values may be quoted strings, booleans or numbers. Environment variables use `$NAME` or `${NAME}`. The `headers` value is JSON encoded as a string.

## 2. Configure the Next.js plugin

Generation 3 defaults to:
- Provider directory: `.EngineAPIConfig`
- Compiled provider artifact: `.nextjs-engine/config/.apiconfig.json`
- APIStatic source: `data/endpoint`
- Static output: `public/_static/endpoint`
- Manifest: `manifest.json`

~~~js
const withEngine = require("./src/engine/plugins/enginePlugin");

module.exports = withEngine(nextConfig, {
  api: {
    configDir: ".EngineAPIConfig",
    outputFile: ".nextjs-engine/config/.apiconfig.json",
    endpointDir: "data/endpoint",
    staticOutputDir: "public/_static/endpoint",
    staticManifestFile: "manifest.json"
  }
});
~~~

The repository's Gen 3 private-search example uses the published `nextjs-engine/plugin` subpath. Use the installed package entrypoint when outside a source checkout. The plugin compiles at Next.js config evaluation and watches API/route files in development.

## 3. Resolve a provider

~~~ts
import { EngineAPIResolver, ensureAPIConfig } from "nextjs-engine";

const compiled = await ensureAPIConfig();
const provider = compiled.providers.catalog;
if (!provider) throw new Error("Missing provider.catalog");

const resolver = new EngineAPIResolver({
  ...provider,
  versionMacros: compiled.versions
});

const response = await resolver.resolveRequest({
  input: { sku: "SKU-100" }
});
if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
const result = await response.json();
~~~

`ensureAPIConfig()` reads the `.EngineAPIConfig/*.api` directory directly when no compiled configuration is injected. The plugin's `.apiconfig.json` is a separate build artifact, not the direct source file read by `ensureAPIConfig()`. Call it from server/build code only.

## Authentication

| Type | Required values | Behavior |
|---|---|---|
| `none` | None | No auth header |
| `ak` | `key` | API-key header; optional destination header |
| `bearer` / `jwt` | `token` | Bearer authorization |
| `basic` | `username`, `password` | Basic authorization |
| `hmac` | `secret` | Timestamped HMAC signature |
| `pnp` | `privateKey` | Timestamped asymmetric signature |

HMAC supports SHA-256/SHA-512; PNP supports Ed25519/RS256. Required credentials fail closed. Signed auth rejects multipart FormData bodies; use JSON or a non-signing mode.

> [!WARNING]
> Keep secrets in environment variables available to trusted build/server code. Do not commit credentials or expose them to client components.

## Override precedence

```text
global provider config → pageOverrides → nodeOverrides
```

Nested objects merge; endpoint values replace atomically. Version macros replace `&NAME&` tokens. See [Networking APIs](../api/networking.md), [API relationships](../api/relationships.md) and [APIStatic configuration](./api-static.md).
