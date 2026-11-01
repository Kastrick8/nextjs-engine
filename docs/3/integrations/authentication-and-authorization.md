# Authentication and authorization — Generation 3

> **Generation 3 · Alpha** · Security behavior checked against `main-3`.

Generation 3 has three separate networking/security concerns. Do not treat them as interchangeable:

1. **EngineAPIResolver authentication** signs or credentials an outgoing request to an upstream service.
2. **APIStatic** executes downloadable browser-side route modules and does not authenticate users or authorize access.
3. **NENC** is the optional server-side command dispatcher that can authenticate an application user, enforce declared permissions, apply replay/rate policy, and then call a server-selected EngineAPIResolver.

## Authentication vs authorization

Authentication answers “who is making this request?” Authorization answers “may this principal perform this command or access this resource?” User-interface visibility is neither. Enforce access on the server for every private operation, including account, billing, tenant, and dashboard data.

## EngineAPIResolver: upstream request authentication

For ordinary HTTP endpoints, `EngineAPIResolver` supports:

| `auth.type` | Required values | Outgoing request behavior |
|---|---|---|
| `none` | — | No auth header |
| `ak` | `key` | API key in `X-Key` by default; custom destination header supported |
| `bearer` / `jwt` | `token` | `Authorization: Bearer …`; `jwt` is not locally decoded/validated |
| `basic` | `username`, `password` | HTTP Basic Authorization |
| `hmac` | `secret` | Timestamped SHA-256/SHA-512 HMAC signature |
| `pnp` | `privateKey` | Timestamped Ed25519/RS256 asymmetric signature |

These modes authenticate Engine to the upstream API. They do not authenticate the website's current user or determine that user's account permissions. The target service must verify the credential/signature and apply its own access policy. HMAC/PNP signing cannot sign browser-generated multipart FormData bodies.

Keep keys, secrets, service tokens, and private signing keys in server-only configuration. Do not put them in `NEXT_PUBLIC_` variables, browser components, schemas, APIStatic route files, or serialized props.

## APIStatic has no account security system

APIStatic compiles `.route` files to static JavaScript below `public/_static/endpoint`; the browser downloads and executes these modules. It validates declared input fields/types and supplies response/error helpers. It does not provide session authentication, account identity, roles, permission scopes, or per-user authorization.

> **Important:** An APIStatic input schema is not an access-control policy. A required `accountId: "string"` field proves only that the caller supplied a string; it does not prove ownership of that account.

When `EngineAPIResolver` receives an `APIStatic.endpoint(...)` descriptor, it returns through the APIStatic runtime before constructing the normal HTTP request or applying `auth` headers. Therefore, `auth: { type: "bearer", ... }` on a static descriptor does **not** secure that operation.

`configureAPIStatic({ proxy })` only installs a proxy callback. It is not a server, session checker, or authorization policy. Use it to call an application-owned server endpoint, and enforce identity/permissions inside that endpoint. The unconfigured default proxy throws.

## NENC: server-side command authentication and authorization

NENC is opt-in through the Generation 3 Next.js plugin. A command declaration includes its runtime, auth mode, permissions and input schema:

```ts
import { EngineCommand } from "nextjs-engine/network";

type SearchInput = { search: string };

// Login is intentionally anonymous at the NENC layer.
// The server command still verifies credentials with your identity/backend service.
export const loginCommand = EngineCommand.create<
  { email: string; password: string },
  Response
>("account.login", {
  run: "server",
  auth: "anonymous",
  input: {
    email: { type: "string", maxLength: 254 },
    password: { type: "string", maxLength: 1024 },
  },
  async execute({ input, api }) {
    return api.resolveRequest({ input });
  },
});

// Private account operation: require an account session and a permission.
export const privateSearch = EngineCommand.create<SearchInput, Response>(
  "catalog.privateSearch",
  {
    run: "server",
    auth: "account",
    permissions: ["catalog.read"],
    input: { search: { type: "string", maxLength: 120 } },
    async execute({ input, api, principal }) {
      return api.resolveRequest({
        input: {
          search: input.search,
          accountId: (principal as { subject: string }).subject,
        },
      });
    },
  },
);
```

The declaration is scanned during build; `execute()` runs on the server. Keep command declarations out of client bundles. The login example above only shows the transport contract: the server implementation must verify the submitted credentials with your identity provider and create the session. The default auth mode for a command is `"anonymous"`; it does not become account-protected unless you explicitly set `auth: "account"`. Declaring an empty permissions array also means no permission callback is required for that command.

## Standard account-session policy

`createNENCAccountSessionPolicy()` supplies a fail-closed policy for commands whose `auth` is `"account"`. Your application still owns login, session issuance, session persistence, logout/revocation, and the backing store.

```ts
import { EngineAPIResolver } from "nextjs-engine";
import {
  createNENCAccountSessionPolicy,
  createNENCCommandAPIResolverFactory,
  createNENCDispatcher,
} from "nextjs-engine/server";

const accountSessions = createNENCAccountSessionPolicy({
  async resolveSession(tokenHash, context) {
    // Look up the SHA-256 hash in your own session store.
    // Return null for missing, expired, revoked, or disallowed sessions.
    return sessionStore.findActiveByTokenHash(tokenHash, context.commandName);
  },
});

// Select the private resolver on the server, after auth/authz succeeds.
const api = createNENCCommandAPIResolverFactory({
  resolve({ commandName }) {
    if (commandName !== "catalog.privateSearch") {
      throw new Error("No backend is configured for this command.");
    }
    return new EngineAPIResolver({
      endpoint: process.env.PRIVATE_BACKEND_URL + "/search",
      method: "POST",
      cache: "no-store",
      auth: {
        type: "bearer",
        token: process.env.PRIVATE_BACKEND_TOKEN!,
      },
    });
  },
});

export default function createHandler(manifest) {
  return createNENCDispatcher({
    manifest,
    api,
    authenticate: accountSessions.authenticate,
    authorize: accountSessions.authorize,
  });
}
```

The standard policy:
- reads one session cookie (default name `__Host-engine-session`) and rejects missing, duplicate, malformed, or out-of-range tokens;
- SHA-256 hashes the opaque token before calling `resolveSession`, so the lookup receives the hash rather than the raw cookie value;
- validates the returned session's `id`, `subject`, expiry, optional `notBefore`, and revocation flag; `expiresAt` and `notBefore` are Unix epoch milliseconds (matching `Date.now()`);
- can restrict a session to allowed `commands` and `origins`;
- can require a previously verified device proof when the session has `deviceKeyId`;
- creates a credential-free principal with subject, session ID, permissions, and optional claims;
- checks every declared permission against the principal's permission list (or an explicit `"*"` grant).

The helper does **not** implement password verification, OAuth, sign-up, MFA, cookie issuance, or a database. Your login endpoint creates the opaque random token, stores only its hash with the session record, and issues the cookie with secure attributes. The default cookie name uses the `__Host-` prefix; follow browser cookie requirements for Secure, HttpOnly, Path=/, and an appropriate SameSite policy.

For non-account auth modes, pass `authenticateOther` and `authorizeOther` into the policy or provide your own dispatcher callbacks. Without those callbacks, non-account modes are rejected by the account policy.

## Replay, device binding, rate limits, and credential vaults

- The dispatcher uses a timestamp/nonce replay guard by default. Its default memory store is process-local; use a shared atomic store when replay protection must span multiple server instances.
- `NENCCommandSecurityPolicy` can attach per-command replay/rate rules. Rate limiting is opt-in. Its default in-memory rate store is not a distributed limiter; provide shared storage for multi-instance production.
- `createNENCDeviceSignatureVerifier()` and `EngineDeviceKey` support device-bound proofs when you explicitly configure signature verification. Merely declaring `auth: "account"` does not require a device key unless the session policy record declares one and the dispatcher has verified it.
- `EngineCookies` is a separate sealed credential vault/Trust List capability. It is not the login/session database and does not replace native application sessions.

## Integrate an existing identity provider

Auth.js, Clerk, Supabase Auth, and custom identity systems can continue to own account identity. They are not automatically installed as NENC adapters. Connect your login/session layer to the NENC session store or adapt the policy callbacks so that the request is resolved to an application principal and permissions before command execution. Keep the identity provider's server credentials and private tokens out of browser code.

Official references: [Next.js authentication tutorial](https://nextjs.org/learn/dashboard-app/adding-authentication) · [Auth.js](https://authjs.dev/getting-started) · [Clerk App Router auth](https://clerk.com/docs/reference/nextjs/app-router/auth) · [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side).

See [Networking, credentials, and command security](../networking-credentials-security.md), [NENC configuration](../configuration/nenc.md), and the [private-search example](https://github.com/Kastrick8/nextjs-engine/tree/main-3/examples/gen3-private-search).
