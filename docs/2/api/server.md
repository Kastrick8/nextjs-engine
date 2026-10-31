# Server API — Generation 2

Generation 2 exposes a small server-only entrypoint at nextjs-engine/server.

~~~ts
import { getServerDevice } from "nextjs-engine/server";
const device = await getServerDevice();
~~~

The server entrypoint also exports detectDevice(), DESKTOP_DEVICE and the DeviceBrand, DeviceInfo and DeviceOS types.

Use getServerDevice() only in a request-aware Next.js server context. It reads the request User-Agent through Next.js headers and returns desktop defaults outside a supported request context.

Generation 2 does not expose the Generation 3 EngineServer session facade, EngineCORS or NENC server APIs.
