# Server API — Generation 2

Generation 2 exposes a small server-only entrypoint at nextjs-engine/server.

~~~ts
import { getServerDevice } from "nextjs-engine/server";
const device = await getServerDevice();
~~~

The server entrypoint also exports detectDevice(), DESKTOP_DEVICE and the DeviceBrand, DeviceInfo and DeviceOS types.

Use getServerDevice() only in a request-aware Next.js server context. It reads the request User-Agent through Next.js headers and returns desktop defaults outside a supported request context.

Generation 2 does not expose the Generation 3 EngineServer session facade, EngineCORS or NENC server APIs.


> **Generation 3 migration warning:** Gen 3 expands this same `nextjs-engine/server` subpath with `EngineServer`, `EngineCORS`, NENC dispatch, and account-session policy APIs. Those names are not exported by Gen 2; importing them here produces TypeScript missing-export errors. See the [Gen 3 Server API](https://github.com/Kastrick8/nextjs-engine/blob/main-3/docs/3/api/server.md) and the [Gen 2 → Gen 3 migration guide](../migration-to-gen3.md).
