# Configure EngineAPIResolver — Generation 2

EngineAPIResolver sends ordinary HTTP requests and may dispatch APIStatic endpoint descriptors. Provider files under `.EngineAPIConfig` are different from APIStatic `.route` files.

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

The parser reads sorted `.api` files. Supported sections are `[provider.NAME]`, `[provider.NAME.auth]` and `[versions]`. Lines use `key=value`; `#` starts a comment. Values may be quoted strings, booleans or numbers. Environment variables use `$NAME` or `${NAME}`. The `headers` field is JSON encoded as a string.

## 2. Configure the Next.js plugin

Generation 2 defaults:
- Provider directory: `.EngineAPIConfig`
- Compiled provider artifact: `.engine-api-compiled.json`
- APIStatic source: `data/endpoint`
- Static output: `public/_static/endpoint`
- Manifest: `manifest.json`

~~~js
const withEngine = require("./src/engine/plugins/enginePlugin");

module.exports = withEngine(nextConfig, {
  api: {
    configDir: ".EngineAPIConfig",
    outputFile: ".engine-api-compiled.json",
    endpointDir: "data/endpoint",
    staticOutputDir: "public/_static/endpoint",
    staticManifestFile: "manifest.json"
  }
});
~~~

Generation 2 also accepts these API options at the top level for backward compatibility. In a source checkout the path above is appropriate; for a package consumer, use the plugin entrypoint actually shipped by that installed build.

## 3. Load and resolve a provider

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
  formData: { sku: "SKU-42" }
});
if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
const result = await response.json();
~~~

Important: `ensureAPIConfig()` reads the `.EngineAPIConfig/*.api` directory itself when no compiled config is injected. The plugin's `.engine-api-compiled.json` is a separate build artifact, not the direct file input for `ensureAPIConfig()`. Call it from server/build code only.

## Authentication

| Type | Required values | Behavior |
|---|---|---|
| `none` | None | No auth header |
| `ak` | `key` | API-key header; configurable destination header |
| `bearer` / `jwt` | `token` | Bearer authorization |
| `basic` | `username`, `password` | Basic authorization |
| `hmac` | `secret` | Timestamped HMAC signature |
| `pnp` | `privateKey` | Timestamped asymmetric signature |

HMAC supports SHA-256/SHA-512; PNP supports Ed25519/RS256. Required credentials fail closed. Signed auth rejects multipart FormData bodies; use JSON where supported by the request API or a non-signing auth mode.

> [!WARNING]
> Keep secrets in environment variables available only to trusted build/server code. Do not commit credentials or expose them to browser components.

## Override precedence

```text
global provider config → pageOverrides → nodeOverrides
```

Nested objects merge; endpoint values replace atomically. Version macros replace `&NAME&` tokens. See [Networking APIs](../api/networking.md), [API relationships](../api/relationships.md) and [APIStatic configuration](./api-static.md).
