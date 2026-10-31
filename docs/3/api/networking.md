# EngineAPIResolver and APIStatic Public APIs

This page explains how the public networking APIs compose. For project setup and file layout, use [Configuration → EngineAPI](../configuration/engine-api.md) and [Configuration → APIStatic](../configuration/api-static.md).

## EngineAPIResolver

`EngineAPIResolver` accepts a global `EngineAPIConfig` and exposes `resolveRequest()`.

```ts
import {
  EngineAPIResolver,
  ensureAPIConfig
} from "nextjs-engine";

const compiled = await ensureAPIConfig();
const resolver = new EngineAPIResolver({
  ...compiled.providers.catalog,
  versionMacros: compiled.versions
});

const response = await resolver.resolveRequest({
  input: { sku: "SKU-42" }
});
```

### Configuration merge order

```text
constructor/global config
        ↓
pageOverrides
        ↓
nodeOverrides
```

Nested plain objects are merged. The `endpoint` property is replaced atomically by the most specific configuration.

### Request behavior

| Setting | Behavior |
|---|---|
| `endpoint` | URL string, or an APIStatic descriptor `{ static, operation? }` |
| `method` | HTTP method; defaults to GET |
| `cache` | Fetch cache mode |
| `headers` | Request headers |
| `versionMacros` | Replaces `&NAME&` tokens in the URL |
| `auth` | Selects the supported authentication mode |

`resolveRequest({ input })` uses JSON for ordinary object inputs and creates multipart FormData when binary values are present. `formData` remains the compatibility input field. GET/HEAD requests do not receive a body.

Supported auth modes are `none`, `ak`, `bearer`, `jwt`, `basic`, `hmac` and `pnp`. HMAC uses SHA-256 or SHA-512; PNP uses Ed25519 or RS256. Signing modes reject multipart FormData because the browser-generated body is not available deterministically before fetch.

> [!WARNING]
> Authentication material belongs in a server/build-controlled configuration environment. Never embed a private API key or signing secret in a browser component or a downloadable APIStatic route.

## APIStatic

APIStatic is a browser runtime for loading and executing compiled `.route` programs.

```ts
import { APIStatic, EngineAPIResolver } from "nextjs-engine";

const result = await APIStatic.resolve("catalog/search", "lookup", {
  query: "keyboard"
});

const resolver = new EngineAPIResolver({
  endpoint: APIStatic.endpoint("catalog/search", "lookup")
});

const response = await resolver.resolveRequest({
  input: { query: "keyboard" }
});
```

The runtime obtains the endpoint manifest, resolves the logical route to its hashed JS module, injects the module in the browser, validates the selected operation's declared input schema and converts the result to a `Response`.

### APIStatic public runtime methods

| Method | Purpose |
|---|---|
| `APIStatic.endpoint(route, operation?)` | Build an endpoint descriptor |
| `APIStatic.getEndpoints()` / `names()` / `has(route)` | Discover endpoints from the manifest |
| `APIStatic.resolve(route, input?)` | Execute the only operation or choose by overload |
| `APIStatic.resolve(route, operation, input?)` | Execute an explicit operation |
| `new APIStatic(options)` | Create an isolated runtime instance |
| `execute(route, options)` | Return the operation result directly |
| `resolveRequest(route, options)` | Return a Response for the operation |
| `clear(route?)` | Clear the runtime module cache |
| `configureAPIStatic(options)` | Replace the default runtime instance |
| `getDefaultAPIStatic()` | Obtain the current default runtime |

The default route base is `/_static/endpoint`; the manifest defaults to `manifest.json`. The default load timeout is 10 seconds. Development cache busting is enabled by default.

## How the .route DSL maps to the runtime

The `.route` compiler transforms declarations into a module containing one or more named operations. Supported `run` sources are `query`, `body`, `input` and `proxy`. A source-specific input schema validates/coerces declared values before the operation runs.

```ts
function calculateTotal(price: number, quantity: number) {
  const subtotal = price * quantity;
  return {
    subtotal,
    tax: subtotal * 0.18,
    total: subtotal * 1.18
  };
}

createEndpoint([
  {
    name: "calculate",
    query: {
      price: "number",
      quantity: "number=1"
    },
    run.query(return calculateTotal[query.price, query.quantity])
  }
]);
```

This syntax belongs in a `.route` file; it is not ordinary TypeScript to import directly. Use the logical route/operation names from application code; generated hashed filenames are build artifacts.

## Security model

A compiled route module is public browser code. It can call only what is embedded in that program or delegated through the configured proxy. The proxy must be a constrained server endpoint with explicit target allowlisting, authentication, authorization, rate limiting and secret protection. Do not put private credentials, filesystem/database work or privileged session logic in a `.route` file.
