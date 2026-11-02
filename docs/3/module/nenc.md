# NENC — Next.js Engine Command Transport

NENC is the Generation 3 server-owned command transport for applications that need a typed command interface behind authentication and authorization boundaries.

## Architecture

```text
declared command manifest
        ↓
client command request
        ↓
NENC dispatcher
        ├── origin/destination validation
        ├── session authentication
        ├── device proof (when configured)
        ├── command schema validation
        ├── authorization / rate policy
        ├── replay protection
        └── server handler
```

## Main subsystems

| Subsystem | Responsibility |
|---|---|
| EngineCommand | Command declarations, validation and execution |
| NENCManifest | Build/runtime command manifest |
| NENCClient | Browser request client |
| NENCDispatcher | Server request dispatch |
| NENCOrigin | Origin and destination resolution |
| NENCSessionAuth | Account/session policy and token hashing |
| NENCDeviceProof | Device signature verification |
| NENCCommandSecurity | Authorization and rate limiting |
| NENCReplay | Replay guard and store |
| NENCCommandAPI | Application resolver factory |

## Public command contract

The browser-facing declaration API is exported from `nextjs-engine/network`.
The dispatcher, session policy, device-signature verifier, replay/rate policy,
and request-scoped API resolver factory are server-only exports from
`nextjs-engine/server`. Keep those entrypoints on their respective sides of
the React Server Component boundary.

### Declare a command

```ts
import { EngineCommand } from "nextjs-engine/network";

export const accountSummary = EngineCommand.create<{ accountId: string }, { name: string }>(
  "account.summary",
  {
    run: "server",
    auth: "account",
    permissions: ["account.read"],
    input: { accountId: { type: "string", maxLength: 64 } },
    async execute({ input, api }) {
      const response = await api.resolveRequest({
        input: { accountId: input.accountId }
      });
      if (!response.ok) throw new Error("Account lookup failed.");
      return await response.json();
    }
  }
);
```

`EngineCommand.create()` registers a command definition and returns a typed
handle; it is an alias of `registerEngineCommand()`. The definition's
`execute()` receives `name`, validated `input`, the server-side
`EngineAPIResolver`, and optional `principal`, `request`, `origin`, and
`signal` context fields. `EngineCommand.run(name, input)` is the client-facing
transport call and requires a configured transport.

The compiler discovers command declarations from the configured source files
using the TypeScript AST. The command name and security metadata must be
statically declared, and the definition must be an inline object containing
`execute()`. Do not use object spreads or computed security metadata in a
declaration. The compiler extracts metadata; it does not execute the command
implementation during discovery.

### Runtime and input types

| Contract | Values / fields |
| --- | --- |
| `EngineCommandRuntime` | `"client"`, `"server"`, `"auto"` |
| `EngineCommandAuth` | `"anonymous"`, `"account"`, or an application-defined auth name |
| `EngineCommandInputType` | `"string"`, `"number"`, `"boolean"`, `"object"`, `"array"`, `"unknown"` |
| `EngineCommandDefinition` | `run?`, `auth?`, `permissions?`, `input?`, `validate?`, required `execute()` |
| `EngineCommandInputField` | `type`, `optional?`, `default?`, `min?`, `max?`, `maxLength?` |

Defaults are `run: "auto"` and `auth: "anonymous"`; `permissions` defaults to
an empty list. A non-anonymous command needs an authenticator at dispatch time.
A command with permissions needs an authorizer as well—authentication alone
does not grant permissions. For protected operations, declare both an
appropriate `auth` mode and explicit permissions.

`validateEngineCommandInput()` applies field types and the optional/default
and numeric/string/array bounds. Numbers must be finite, object values must be
plain objects, and unknown input keys are not copied into the validated
result. This is input shaping, not authorization or business-rule validation;
use `validate()` and server-side checks for domain-specific rules.

### Browser transport

`createNENCTransport(manifest, options)` accepts:

| Option | Meaning |
| --- | --- |
| `fetcher?` | Compatible `fetch` implementation, useful for controlled runtimes and tests |
| `deviceKey?` | `EngineDeviceKey` used to sign the request proof |
| `destinationOrigin?` | Explicit destination origin for device-proof generation |

The transport sends JSON to the manifest endpoint (`/_static/command`), uses
same-origin credentials, generates a cryptographically random nonce, and
sends the build-specific opaque selector, nonce, and timestamp headers. When
a device key is supplied, it also signs the method, target, destination
origin, body hash, timestamp, and nonce. Opaque wire identifiers are
transport encoding—not credentials and not an authorization mechanism.

Configure the transport in a Client Component or another browser-owned module:

```tsx
"use client";

import { EngineCommand, configureEngineCommandTransport, createNENCTransport } from "nextjs-engine/network";
import { NENC_CLIENT_MANIFEST } from "../../.nextjs-engine/nenc/client";

configureEngineCommandTransport(createNENCTransport(NENC_CLIENT_MANIFEST));

export function SearchButton() {
  async function search() {
    return EngineCommand.run("catalog.search", { query: "engine" });
  }
  return <button onClick={() => void search()}>Search</button>;
}
```

### Server dispatcher options

`createNENCDispatcher()` returns a `Request` to `Response` handler. Its
required options are the generated server `manifest` and either an
`EngineAPIResolver` or a request-scoped resolver factory. Additional options:

| Option | Purpose |
| --- | --- |
| `trust?` | `EngineTrustList` policy for cross-origin command trust |
| `cors?` | Exact-origin CORS and preflight policy |
| `replay?` | Default `NENCReplayGuard` |
| `commandSecurity?` | Per-command replay and rate-limit rules |
| `maxBodyBytes?` | Request body limit; defaults to 64 KiB |
| `authenticate?` | Authenticates non-anonymous commands and may return a principal |
| `authorize?` | Authorizes the command's declared permissions |
| `verifySignature?` | Verifies the optional device/request signature before authentication |

The handler accepts `POST` and `OPTIONS`. It resolves the opaque command
selector, enforces cross-origin CORS/trust when applicable, checks timestamp
and nonce replay, bounds and decodes the body, optionally verifies a
signature, authenticates, rate-checks, authorizes permissions, resolves the
server API, and finally executes the registered command. Failure responses
are deliberately generic so request details and secrets are not echoed.

### Replay, rate limits, and account sessions

`NENCReplayGuard` defaults to a 60-second clock-skew window and an in-memory
store. The default store protects only within one process. Multi-instance or
serverless deployments that require replay protection across instances must
supply a shared store whose `claim()` operation is atomic.

`NENCRateLimiter` implements fixed-window limits. Configure a positive
`limit`, a `windowMs` of at least one second, and a shared atomic
`NENCRateLimitStore` for multi-instance deployments. A configured rate rule
fails closed when key resolution or storage fails; the included memory store
is for a single process, not durable distributed enforcement.

`createNENCAccountSessionPolicy()` supplies account-cookie authentication
and permission authorization. Its default cookie name is
`__Host-engine-session`; default token length bounds are 32–512 characters.
It hashes the opaque token with SHA-256 before calling `resolveSession()` and
rejects duplicate/malformed cookies, expired or revoked sessions,
not-yet-active sessions, and disallowed command/origin/device combinations.
Issue the cookie as host-only, `Secure`, `HttpOnly`, `SameSite`, and
`Path=/`; store only the token hash in the server-side session store.

### Device proof and request-scoped API resolution

`createNENCDeviceSignatureVerifier({ resolveIdentity })` resolves a public
device identity by key ID, then verifies the proof against the request method,
path and query, destination origin, raw-body hash, timestamp, and nonce.
Applications own identity registration and storage; do not treat the proof
as a replacement for session authentication or permission authorization.

`createNENCCommandAPIResolverFactory({ resolve })` creates an API resolver
after dispatcher authentication, rate checks, and permission authorization.
Its frozen context contains the logical command name, auth mode, permissions,
principal, normalized origin, and abort signal. It deliberately does not pass
the raw request, cookie, signature, timestamp, nonce, or command input to the
factory, which helps keep resolver selection separate from untrusted request
data. Return an `EngineAPIResolver` or an `EngineAPIConfig`.

A command may return a `Response`, a JSON-serializable value, or `undefined`.
A returned `Response` is preserved; ordinary values are JSON encoded and
`undefined` becomes a 204 response. Filter backend results explicitly before
returning them to a browser instead of forwarding private fields or
diagnostic headers.

For the full plugin setup, dispatcher example, account-session wiring,
cross-origin policy, persistent-store guidance, and end-to-end private-search
example, see the [complete networking, credentials, and command security
guide](../ne/security/networking-credentials-security.md). Also see
[NENC configuration](../configuration/nenc.md), [Network API](../api/network.md),
[Server API](../api/server.md), and
[Authentication and authorization](../integrations/authentication-and-authorization.md).
## Configure the plugin

See [NENC configuration](../configuration/nenc.md) for `commandFiles`, `handlerModule`, `seed` and `buildId` setup.

## Security model

- Commands are allowlisted by the generated manifest.
- The browser does not receive server handler implementations.
- Input is validated before invoking a handler.
- Authentication is not authorization; enforce both.
- Configure allowed origins, session lifetime, device binding, rate limits and replay storage for the deployment.
- Keep keys and secrets outside source control and browser bundles.

For the server-only exports see [Server API](../api/server.md). For related sealed data see [EngineCookies](./engine-cookies.md).
