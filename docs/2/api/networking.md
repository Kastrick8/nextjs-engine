# EngineAPIResolver and APIStatic

EngineAPIResolver and APIStatic are separate but cooperating public APIs. For file layout and plugin setup, see [Configuration](../configuration/index.md).

## EngineAPIResolver

~~~ts
import { EngineAPIResolver, ensureAPIConfig } from "nextjs-engine";

const compiled = await ensureAPIConfig();
const provider = compiled.providers.catalog;
if (!provider) throw new Error("Missing provider.catalog");

const resolver = new EngineAPIResolver({
  ...provider,
  versionMacros: compiled.versions
});

// For a normal URL endpoint, Gen 2 sends the request body via formData.
const response = await resolver.resolveRequest({
  formData: { sku: "SKU-42" }
});
~~~

Resolver config merges constructor/global → `pageOverrides` → `nodeOverrides`. Nested plain objects merge, but endpoint values replace atomically. For normal HTTP endpoints, `formData` supplies the request body. For a static endpoint descriptor, `input` is forwarded to APIStatic; `formData` is used as its fallback when `input` is omitted.

Auth modes are `none`, `ak`, `bearer`, `jwt`, `basic`, `hmac` and `pnp`. HMAC supports SHA-256/SHA-512; PNP supports Ed25519/RS256. Signing modes reject multipart FormData because the browser-generated body cannot be signed deterministically before fetch.

> [!WARNING]
> Keep private credentials in trusted server/build config. Do not bundle them into browser code or static routes.

## APIStatic

~~~ts
import { APIStatic, EngineAPIResolver } from "nextjs-engine";

const response = await APIStatic.resolve("catalog/lookup", "search", {
  query: "keyboard"
});

const resolver = new EngineAPIResolver({
  endpoint: APIStatic.endpoint("catalog/lookup", "search")
});

// For a static endpoint, input is passed into the declared operation.
const throughResolver = await resolver.resolveRequest({
  input: { query: "keyboard" }
});
~~~

APIStatic reads the manifest, maps a logical route to its generated hashed browser module and validates the selected operation's input schema. Defaults are `/_static/endpoint`, `manifest.json` and a 10-second load timeout. Public methods include `endpoint`, `getEndpoints`, `names`, `has`, `resolve`, `execute`, `resolveRequest`, `getURL`, `getManifestURL` and `clear`. `configureAPIStatic()` replaces the default runtime instance.

## .route DSL

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

This special syntax belongs in a `.route` file. Supported run sources are `query`, `body`, `input` and `proxy`; schema types include string, number, boolean, array, object and any.

> [!CAUTION]
> A compiled route is public browser code. Never include secrets, database access, filesystem operations or private session logic. Use a server endpoint or a constrained proxy with independent target validation and authorization.
