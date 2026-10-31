# Configure APIStatic

APIStatic compiles .route files into static JavaScript modules that execute in the browser. It is not a hidden Next.js Route Handler.

## 1. Source files

~~~text
data/
└── endpoint/
    ├── math.route
    └── user/
        └── profile.route
~~~

Relative file paths become logical route names (math, user/profile). The compiler generates hashed JavaScript files under public/_static/endpoint and a manifest.json discovery file.

## 2. Declare operations

~~~ts
function add(a: number, b: number) {
  return { total: a + b };
}

createEndpoint([
  {
    name: "add",
    query: { a: "number", b: "number" },
    run.query(add[query.a, query.b])
  }
]);
~~~

Supported input types include string, number, boolean, array, object and any. Optional fields use ? and defaults use =. A route can declare multiple named operations.

## 3. Call an endpoint

~~~ts
import { APIStatic, EngineAPIResolver } from "nextjs-engine";

const response = await APIStatic.resolve("math", "add", { a: 20, b: 30 });

const resolver = new EngineAPIResolver({
  endpoint: APIStatic.endpoint("math", "add")
});
const alsoWorks = await resolver.resolveRequest({ input: { a: 10, b: 15 } });
~~~

Use logical route names and operation IDs; never hardcode generated hashes.

## Build options

| Setting | Default |
|---|---|
| Source | data/endpoint |
| Static output | public/_static/endpoint |
| Manifest | manifest.json |
| Runtime base path | /_static/endpoint |

Override through plugin options: endpointDir, staticOutputDir and staticManifestFile. Existing source files are watched during next dev.

> [!CAUTION]
> Route programs are downloadable by the browser. Never put secrets, private environment values, database credentials, filesystem operations or privileged server-session logic inside a .route file. Use a server endpoint or a server-side proxy with validation and authorization.

See [APIStatic module](../module/apistatic.md) and [EngineAPIResolver](./engine-api.md).
