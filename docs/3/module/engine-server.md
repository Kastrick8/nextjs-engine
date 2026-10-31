# EngineServer

EngineServer is the Generation 3 server-only helper for request-scoped access to Next.js headers, cookies, device information and server navigation.

## Open a session

```ts
import { EngineServer } from "nextjs-engine/server";

const server = await EngineServer.open();

const userAgent = server.headers.get("user-agent");
const sessionCookie = server.cookies.get("session");

const response = await server.fetch("/api/status");
```

The session exposes read-only wrappers around the request cookie/header stores, a detected device profile, fetch helpers, and Next.js `redirect()`/`notFound()` methods.

## Page wrapper

```tsx
import { EngineServer } from "nextjs-engine/server";

export default EngineServer.page(async (server) => {
  const status = await server.fetchJSON<{ message: string }>("/api/status");
  return <p>{status.message}</p>;
});
```

`EngineServerSession.open()` and `getServerDevice()` require a request-aware server context. Keep imports out of client components.

See [Server API](../api/server.md) and [EngineDevice](./enginemobile.md).
