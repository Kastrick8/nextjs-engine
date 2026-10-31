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

The vault uses AES-256-GCM with Web Crypto and requires a non-exportable encryption key. Access is checked against the registration metadata and request context before a payload is used.

## Usage boundary

Use EngineCookies only from the server-owned application path. Select a persistent record store for production deployments; the built-in memory store is an in-process implementation and is not durable across restarts or instances.

See [NENC security architecture](../ne/security/index.md) and [Server API](../api/server.md). Do not store passwords or long-lived credentials as plaintext payloads.
