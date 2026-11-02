# EngineCookies

EngineCookies is a Generation 3 server-side data-protection and trust-metadata system. Despite its name, it is not a general-purpose browser cookie wrapper.

## Main concepts

| Concept | Purpose |
|---|---|
| Cookie index | Maps an application alias to opaque storage metadata |
| Registration | Declares owner, creator, purpose, expiry and binding policy |
| Trust list | Describes which callers/devices are trusted |
| Cookie vault | Seals and opens protected payload records |
| Device identity | Binds access to a registered public device identity when configured |

The vault uses AES-256-GCM with Web Crypto and requires a non-exportable encryption key. Access is checked against registration metadata and request context before a payload is used. Depending on the registration, checks can include owner/origin trust, command allowlists, expiry, device proof, and environment binding.

## Usage boundary

Use EngineCookies only from the server-owned application path. Select a persistent record store for production deployments; the built-in memory store is an in-process implementation and is not durable across restarts or instances.

See [NENC security architecture](../ne/security/index.md) and [Server API](../api/server.md). Do not store passwords or long-lived credentials as plaintext payloads.

## Credential-vault authorization is not account authorization

EngineCookies can authorize whether a caller may use a **stored credential entry**. It does not log a website user in, validate a browser account-session cookie, create an account principal, or decide whether that account may read dashboard records. Use an application-owned identity/session provider or the NENC account-session policy for those tasks.

The default `EngineCookieMemoryStore` is process-local. Inject a durable, appropriately protected record store for production; do not assume sealed records survive restarts or are shared across server instances when using the default store.
