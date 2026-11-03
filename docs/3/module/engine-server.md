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

## Authentication boundary

`EngineServerSession` is a request-context helper, not an account-session validator. Its cookie/header views are read-only wrappers over the current Next.js request stores. For example, `server.cookies.get("__Host-engine-session")` only returns the supplied cookie value; EngineServer does not verify signatures, check expiry/revocation, create an account principal, or evaluate permissions.

Resolve and validate the cookie with your own identity/session provider or a server-side NENC policy before returning private data. Do not treat the presence of a cookie as proof of authentication.
