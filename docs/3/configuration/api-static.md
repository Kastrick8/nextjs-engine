# Configure APIStatic — Generation 3

APIStatic compiles `.route` declarations into static JavaScript modules that execute in the browser. It is separate from external provider configuration in `.EngineAPIConfig/*.api`.

## 1. Create route source

~~~text
data/
└── endpoint/
    ├── math.route
    └── catalog/
        └── lookup.route
~~~

The relative file path is the logical route name. Generated hashed JavaScript modules and a `manifest.json` are written under `public/_static/endpoint`.

## 2. Declare an operation

~~~ts
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
~~~

This is Engine's `.route` compiler syntax, not an ordinary module import. A route can declare multiple operations. Supported run sources are `query`, `body`, `input` and `proxy`. Input types include `string`, `number`, `boolean`, `array`, `object` and `any`; `?` marks optional fields and `=` declares a default.

## 3. Call the endpoint

~~~ts
import { APIStatic, EngineAPIResolver } from "nextjs-engine";

const result = await APIStatic.resolve("catalog/lookup", "search", {
  query: "keyboard"
});

const resolver = new EngineAPIResolver({
  endpoint: APIStatic.endpoint("catalog/lookup", "search")
});

const response = await resolver.resolveRequest({
  input: { query: "keyboard" }
});
~~~

The runtime reads the manifest, resolves the logical route/operation to its hash-named module, injects it in the browser and runs the validated operation. Use logical route names, not generated hashes.

## Defaults and security

- Source: `data/endpoint`
- Output: `public/_static/endpoint`
- Manifest: `manifest.json`
- Runtime base: `/_static/endpoint`
- Load timeout: 10 seconds

The plugin compiles on Next.js config evaluation and watches route files in development. Use `configureAPIStatic({ proxy })` only with a dedicated server proxy that validates target URLs, authorization and credentials.

> [!CAUTION]
> Static route programs are downloadable browser code. Never put private API keys, database credentials, filesystem operations, private session data or privileged logic in a `.route` file. Use a server endpoint or NENC for privileged operations.

See [APIStatic module](../module/apistatic.md), [Networking APIs](../api/networking.md) and [EngineAPI configuration](./engine-api.md).
