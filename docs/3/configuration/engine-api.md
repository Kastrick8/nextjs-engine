# Configure EngineAPIResolver

EngineAPIResolver handles external HTTP requests, provider defaults, request overrides, supported authentication modes and dispatch to APIStatic descriptors.

## 1. Add provider configuration

Create the default configuration directory:

```text
.EngineAPIConfig/
└── main.api
```

A provider file uses a TOML-inspired section format:

```ini
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
```

The parser reads `.api` files in sorted filename order. Both `$NAME` and `${NAME}` environment-variable forms are substituted at compile/load time. Put secrets in your environment and make sure the variable exists in the environment where Next.js evaluates the Engine configuration.

## 2. Configure the Engine Next.js plugin

The Engine plugin compiles provider configuration and APIStatic route artifacts. Generation 3 writes the combined provider artifact to `.nextjs-engine/config/.apiconfig.json` by default.

In a source checkout, the plugin is wired in `next.config.js`:

```js
const withEngine = require("./src/engine/plugins/enginePlugin");

const nextConfig = {
  reactStrictMode: true
};

module.exports = withEngine(nextConfig, {
  api: {
    configDir: ".EngineAPIConfig",
    outputFile: ".nextjs-engine/config/.apiconfig.json",
    endpointDir: "data/endpoint",
    staticOutputDir: "public/_static/endpoint",
    staticManifestFile: "manifest.json"
  }
});
```

The plugin evaluates at Next.js config time, compiles the configured directories, and watches the source directories during development. When using a published package, use the plugin entrypoint supplied by that installed package version rather than copying a repository-relative path that does not exist in your application.

## 3. Load the compiled provider

```ts
import {
  EngineAPIResolver,
  ensureAPIConfig
} from "nextjs-engine";

const compiled = await ensureAPIConfig();
const provider = compiled.providers.catalog;

if (!provider) {
  throw new Error("Missing provider.catalog configuration");
}

const resolver = new EngineAPIResolver({
  ...provider,
  versionMacros: compiled.versions
});

const response = await resolver.resolveRequest({
  input: { sku: "SKU-100" }
});

if (!response.ok) {
  throw new Error(`Catalog request failed: ${response.status}`);
}

const result = await response.json();
```

`ensureAPIConfig()` is a server/build helper because it may read files and environment values. Do not call it from browser code. Explicit configuration directories are cached independently.

## 4. Authentication modes

| Type | Required values | Behavior |
|---|---|---|
| `none` | None | No auth header |
| `ak` | `key` | API-key header; configurable destination header |
| `bearer` | `token` | Bearer authorization |
| `jwt` | `token` | Bearer authorization using the JWT |
| `basic` | `username`, `password` | Basic authorization |
| `hmac` | `secret` | Timestamped HMAC signature |
| `pnp` | `privateKey` | Timestamped asymmetric signature |

HMAC supports SHA-256 and SHA-512. PNP supports Ed25519 and RS256. Configured authentication fails closed when a required secret is missing or empty.

> [!WARNING]
> Do not hardcode secrets in `.api` files, commit local environment files, or expose private credentials to client components. HMAC and PNP cannot sign browser-generated multipart FormData bodies; use JSON input or an appropriate non-signing auth mode.

## 5. Override precedence

EngineAPIResolver merges configuration in this order:

```text
global provider config
        ↓
page overrides
        ↓
node overrides
```

Later values override earlier ones. Nested plain objects are merged; the endpoint field is replaced atomically. Version macros replace tokens such as `&V1&` in the configured endpoint.

## Troubleshooting

| Symptom | Check |
|---|---|
| Provider is missing | Check the `[provider.name]` section and filename extension |
| Endpoint still contains `&V1&` | Ensure the `[versions]` key exactly matches the macro name |
| Auth fails before fetch | Confirm required environment values are present in the build/runtime environment |
| Config does not update in dev | Check the watched `.EngineAPIConfig` directory and `NEXTJS_ENGINE_API_WATCH` |
| Browser build imports filesystem APIs | Keep config loading in server/build code |

See [EngineAPIResolver module](../module/engineapi.md) for the request API and [APIStatic configuration](./api-static.md) for local compiled endpoints.
