# Authentication and authorization — Generation 2

> **Generation 2 · Stable 2.x** · Security behavior checked against the `main-2` implementation.

## The important distinction

- **Authentication** establishes who or what is making a request.
- **Authorization** decides whether that identity may perform a particular operation or access a particular record.

Generation 2 has request-authentication modes in `EngineAPIResolver`. It does **not** provide a built-in end-user account/session system, role model, or per-command permission engine. APIStatic is not an authenticated API server.

For a dashboard, account page, billing area, or private data operation, enforce the user's session and permission on a server endpoint (or your private backend). Hiding a button or route in the UI is not an authorization check.

## EngineAPIResolver: authentication to an upstream API

For a normal HTTP endpoint, `EngineAPIResolver` can attach credentials/signatures to the outgoing request. When `auth` is omitted, its behavior is `none` and the request is sent without an authentication header.

| `auth.type` | Required fields | What EngineAPIResolver sends |
|---|---|---|
| `none` | — | No authentication header |
| `ak` | `key` | API key in `X-Key` by default; `destinationHeader` can change the header |
| `bearer` | `token` | `Authorization: Bearer …` |
| `jwt` | `token` | The same Bearer header; the resolver does not validate JWT claims |
| `basic` | `username`, `password` | HTTP Basic Authorization |
| `hmac` | `secret` | Timestamped HMAC signature using SHA-256 or SHA-512; optional `key` is sent as `X-Key` |
| `pnp` | `privateKey` | Timestamped asymmetric signature using Ed25519 or RS256; optional `key` is sent as `X-Key` |

The target API must verify the credential or signature and apply its own policy. A timestamped signature is not automatically a replay store, user session, or permission check. Required credentials fail closed when empty or missing. HMAC/PNP signing cannot sign browser-generated multipart FormData bodies; use a JSON body or another suitable auth mode.

These modes authenticate the Engine-to-provider request. They do not log a visitor in, establish the current account, or determine whether that account may read a dashboard.

## APIStatic: public browser code, not a private API

APIStatic compiles `data/endpoint/**/*.route` into JavaScript served below `public/_static/endpoint`. The browser downloads and executes those modules.

APIStatic provides input parsing/schema validation, operation selection, and controlled response/error helpers. It does **not** provide account authentication, session validation, roles, or authorization rules. A declared field such as `userId: "string"` is only input validation; it is not proof that the caller owns that account.

> **Security warning:** do not put private keys, bearer tokens, database credentials, private session data, or privileged account logic in `.route` files. Treat every static route and all its inputs as public and caller-controlled.

Also note that `EngineAPIResolver` dispatches an `APIStatic.endpoint(...)` descriptor directly to APIStatic before applying HTTP auth. Setting `auth: { type: "bearer", ... }` on a static descriptor does **not** authenticate or protect that APIStatic operation.

`configureAPIStatic({ proxy })` supplies a proxy callback; it is not an authentication system. When the callback calls a private server endpoint, that endpoint must independently authenticate and authorize the request. The default proxy is unconfigured and throws.

## Safe dashboard pattern: authorize on the server

Keep the browser responsible for UI and send a request to an application-owned Route Handler. Resolve the account and its permissions on the server before contacting a private upstream API:

```ts
// app/api/dashboard/reports/route.ts
import { NextResponse } from "next/server";
import { EngineAPIResolver } from "nextjs-engine";
import { getCurrentUser } from "@/lib/auth";
import { canReadReports } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser(); // Your session/identity provider
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  if (!canReadReports(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolver = new EngineAPIResolver({
    endpoint: process.env.REPORTS_API_URL!,
    method: "GET",
    cache: "no-store",
    auth: {
      type: "bearer",
      token: process.env.REPORTS_API_TOKEN!,
    },
  });

  const upstream = await resolver.resolveRequest();
  if (!upstream.ok) {
    return NextResponse.json({ error: "Report service failed" }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}
```

`getCurrentUser()` and `canReadReports()` are application-owned placeholders; Engine does not supply them. Validate resource ownership/tenant boundaries as well as broad roles. Keep `REPORTS_API_TOKEN` server-only: never use a `NEXT_PUBLIC_` variable, serialize it into page props, or import it into a Client Component.

## Third-party identity providers

Auth.js, Clerk, Supabase Auth, and other identity/session products can own login, OAuth, MFA, and session issuance. They are not bundled as Engine auth adapters. Use their server-side APIs from your Route Handlers/Server Components, then apply authorization close to the data or operation. See [Third-party libraries](./third-party.md).

## Generation 3 note

Generation 3 adds the optional server-side NENC command-security path and `createNENCAccountSessionPolicy()`. It is **not** part of Gen 2 and is not silently enabled by APIStatic. Read the [Generation 3 authentication and authorization guide](https://github.com/Kastrick8/nextjs-engine/blob/main-3/docs/3/integrations/authentication-and-authorization.md) and [Gen 2 → Gen 3 migration reference](https://github.com/Kastrick8/nextjs-engine/blob/main-3/docs/3/guides/migrating-from-gen2.md) before migrating.
