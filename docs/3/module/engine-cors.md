# EngineCORS

EngineCORS is a Generation 3 server helper for expressing and applying a CORS allow policy.

## Create a rule set

```ts
import { EngineCORS } from "nextjs-engine/server";

const cors = EngineCORS.create({
  allow: ["https://app.example.com"],
  credentials: true,
  methods: ["GET", "POST"],
  headers: ["Content-Type", "Authorization"],
  maxAge: 600
});
```

## Apply it in a Route Handler

```ts
export function OPTIONS(request: Request) {
  return cors.preflight(request) ?? new Response(null, { status: 405 });
}

export function GET(request: Request) {
  return new Response("ok", { headers: cors.headersFor(request.headers.get("Origin")) });
}
```

The rule set normalizes HTTP(S) origins, creates allow headers and handles OPTIONS preflight responses. Credentialed CORS cannot be combined with a wildcard allow origin.

CORS is not authentication or authorization. Validate identity and permissions independently. See [Server API](../api/server.md).
