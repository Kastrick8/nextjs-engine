# Configure APIStatic

APIStatic compiles small TypeScript-like `.route` source files into JavaScript modules loaded by the browser. It is separate from external provider configuration in `.EngineAPIConfig/*.api`.

## 1. Create an endpoint file

The default source directory is:

```text
data/
└── endpoint/
    ├── math.route
    └── account/
        └── profile.route
```

The relative path is the logical endpoint name:

| File | Logical route |
|---|---|
| `data/endpoint/math.route` | `math` |
| `data/endpoint/account/profile.route` | `account/profile` |

## 2. Define operations

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
    run.query(
      calculateTotal[query.price, query.quantity]
    )
  }
]);
```

Supported input schema types include `string`, `number`, `boolean`, `array`, `object` and `any`. A `?` marks an optional value and `=` declares a default. A route can expose one or multiple named operations.

## 3. Build integration and output

The Engine Next.js plugin compiles route files automatically using these defaults:

| Setting | Default |
|---|---|
| Source directory | `data/endpoint` |
| Output directory | `public/_static/endpoint` |
| Manifest | `manifest.json` |
| Runtime base path | `/_static/endpoint` |

The plugin compiles during Next.js configuration evaluation and watches route files during development. Generated endpoint filenames include a stable route hash. Reference endpoints by logical name; never hardcode the generated filename.

## 4. Call an endpoint

```ts
import { APIStatic, EngineAPIResolver } from "nextjs-engine";

const response = await APIStatic.resolve("math", "calculate", {
  price: 25,
  quantity: 3
});

const resolver = new EngineAPIResolver({
  endpoint: APIStatic.endpoint("math", "calculate")
});

const secondResponse = await resolver.resolveRequest({
  input: { price: 10, quantity: 2 }
});
```

For a single-operation route, the operation name can be omitted. For multi-operation routes, select the operation explicitly.

## 5. Use a backend proxy when needed

A route may use the injected `proxy` function to call a configured backend bridge. Configure the runtime with `configureAPIStatic({ proxy })` when the application requires a custom proxy handler.

```ts
import { configureAPIStatic } from "nextjs-engine";

configureAPIStatic({
  proxy: async (target, input, init) => {
    const response = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, input, init })
    });

    if (!response.ok) {
      throw new Error(`Proxy failed: ${response.status}`);
    }

    return response.json();
  }
});
```

This is an application integration example: the server endpoint at `/api/proxy` must independently validate the target, authorize the request and protect credentials. Do not turn the proxy into an unrestricted open proxy.

> [!CAUTION]
> A `.route` file is browser-executable and downloadable. Never put private API keys, database credentials, server filesystem operations, private cookies or privileged authorization logic inside it. Keep confidential work in a server-owned route or NENC handler.

## Runtime configuration

The public API also exposes `configureAPIStatic()`, `staticEndpoint()`, `getAPIStaticRouteURL()` and `getAPIStaticRouteHash()`. Runtime options include `basePath`, `loadTimeoutMs`, `proxy`, `cacheBust` and `manifestFile`. See [APIStatic module](../module/apistatic.md) for endpoint discovery and execution details.
