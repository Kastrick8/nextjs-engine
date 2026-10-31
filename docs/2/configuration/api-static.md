# Configure APIStatic — Generation 2

APIStatic compiles `.route` declarations into static JavaScript modules that execute in the browser. It is not a private Next.js Route Handler.

## 1. Create route source files

~~~text
data/
└── endpoint/
    ├── math.route
    └── catalog/
        └── lookup.route
~~~

The relative file path becomes the logical route name. Generated hash-named JavaScript modules and a `manifest.json` are written under `public/_static/endpoint`.

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

This is Engine's special `.route` syntax, not a module to import as ordinary TypeScript. A route may declare multiple operations. Supported run sources are `query`, `body`, `input` and `proxy`. Input types include string, number, boolean, array, object and any; `?` marks optional values and `=` declares defaults.

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

For a static endpoint descriptor, EngineAPIResolver forwards `input` into APIStatic. For a normal URL endpoint, Generation 2 supplies its HTTP request body via `formData`.

## Defaults and security

- Source: `data/endpoint`
- Output: `public/_static/endpoint`
- Manifest: `manifest.json`
- Runtime base: `/_static/endpoint`
- Load timeout: 10 seconds

The plugin compiles route files at Next.js config evaluation and watches them in development. Compiled routes are downloadable browser code.

> [!CAUTION]
> Never place API keys, private env values, database credentials, filesystem operations or private session logic inside a `.route` file. Use a server endpoint or tightly constrained proxy with independent target validation and authorization.

See [APIStatic module](../module/apistatic.md), [Networking APIs](../api/networking.md) and [EngineAPI configuration](./engine-api.md).
