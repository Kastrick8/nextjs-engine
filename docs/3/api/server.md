# Server-only API

Import request-aware APIs from `nextjs-engine/server`. These exports depend on the Next.js server/request runtime and must not be bundled into client components.

## EngineServer

```ts
import { EngineServer } from "nextjs-engine/server";

export default EngineServer.page(async (server) => {
  const userAgent = server.headers.get("user-agent");
  const sessionCookie = server.cookies.get("session");
  const status = await server.fetchJSON<{ ok: boolean }>("/api/status");

  return <p>{status.ok ? "Ready" : "Unavailable"}</p>;
});
```

The `EngineServerSession` exposes:
- `device` — shared device information.
- `headers` — read-only `get`, `has` and `entries` methods.
- `cookies` — read-only `get`, `has` and `all` methods.
- `fetch()` and `fetchJSON<T>()`.
- `redirect(url)` and `notFound()` wrappers.

`EngineServer.open()` manually opens a session. `EngineServer.page(handler)` creates an async page component and passes a fresh request-scoped session to the handler.

## Device helpers

`getServerDevice()` reads request-aware device details. `detectDevice(userAgent)` is a pure shared helper; `DESKTOP_DEVICE` is the desktop fallback. The matching type family is `DeviceBrand`, `DeviceInfo` and `DeviceOS`.

## EngineCORS

```ts
import { EngineCORS } from "nextjs-engine/server";

const cors = EngineCORS.create({
  allow: ["https://app.example.com"],
  credentials: true,
  methods: ["GET", "POST"],
  headers: ["Content-Type", "Authorization"],
  maxAge: 600
});

export function OPTIONS(request: Request) {
  return cors.preflight(request) ?? new Response(null, { status: 405 });
}

export function GET(request: Request) {
  return new Response("ok", {
    headers: cors.headersFor(request.headers.get("Origin"))
  });
}
```

`EngineCORSRuleSet` provides `isAllowed(origin)`, `headersFor(origin)` and `preflight(request)`. Credentialed CORS cannot use a wildcard allowed origin. CORS controls browser cross-origin access; it does not authenticate or authorize users.

## NENC server exports

The server entrypoint also exports the server-owned command runtime:
- Command inspection/validation/execution: `getRegisteredEngineCommand()`, `getEngineCommandBuildDescriptors()`, `inspectEngineCommands()`, `validateEngineCommandInput()`, `executeRegisteredEngineCommand()`.
- Dispatch and API resolution: `createNENCDispatcher()`, `createNENCCommandAPIResolverFactory()`.
- Origin and device proof: `resolveNENCRequestOrigin()`, `resolveNENCRequestDestinationOrigin()`, `createNENCDeviceSignatureVerifier()`.
- Session policy: `createNENCAccountSessionPolicy()`, `hashNENCSessionToken()`.
- Command security: `NENCCommandSecurityPolicy`, `NENCRateLimiter`, `NENCMemoryRateLimitStore`.
- Replay protection: `NENCReplayGuard`, `NENCMemoryReplayStore`.

The full server export and type names are in the [public export inventory](./exports.md). For plugin setup see [NENC configuration](../configuration/nenc.md).

> [!WARNING]
> Treat server handlers, credentials, signing keys and database access as server-owned. Never import the server entrypoint from a module marked `"use client"`.
