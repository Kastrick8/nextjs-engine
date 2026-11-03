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


## Trust List rules

Trust List entries are normalized HTTP(S) origins, not arbitrary host labels. Duplicate normalized origins are rejected. A rule can grant CORS, command names, and cookie/action combinations separately.

- A command grant is matched against an exact trusted origin and an explicitly allowed command name.
- A cookie grant is matched against an exact origin, a cookie alias (or `*` for any alias at that exact origin), an allowed action (`read`, `write`, `use`, or `delete`), and optional command allowlist.
- A wildcard origin (`*`) may grant CORS only. It cannot grant privileged command or cookie access.
- Credentialed CORS requires an explicit origin; a wildcard is not a substitute for an authenticated/trusted caller.

A Trust List is an origin/capability policy for this vault and NENC integration. It is not an account identity provider or role system.

## Device and environment binding

Registration supports four binding modes:

| Mode | Requirement |
|---|---|
| `none` | No device proof requirement |
| `device-key` | Registered device public identity; proof is required when the vault entry is used |
| `device-key+environment` | Device public identity plus a matching environment hash |
| `strict` | Device public identity plus environment hash; use a verified proof for access |

Any non-`none` binding requires a valid registered public device identity. `device-key+environment` and `strict` require an environment hash, and a supplied registration/environment identity must agree. The vault verifies the device proof against the registered identity and the expected request details before exposing the sealed payload to the operation.

A public device identity contains public-key material; it is not the private device key. Keep private keys on the device that owns them, never in the Trust List or a schema payload.

## Key and storage lifecycle

When no custom sealing key is supplied, `EngineCookieVault.create()` generates a non-exportable AES-GCM 256-bit key with encrypt/decrypt usages. A caller-supplied key must also be non-exportable AES-GCM and allow both usages. Store and reuse the supplied key securely if sealed records must survive a process restart; the default generated key exists only for the lifetime of that vault instance.

The default `EngineCookieMemoryStore` is in-process memory. Use an application-provided persistent `EngineCookieRecordStore` for restart durability or multi-instance deployments, and protect that storage as credential data. The index contains only metadata and opaque storage IDs; the sealed payload remains in the record store.

## Usage boundary

Use EngineCookies only from the server-owned application path. Select a persistent record store for production deployments; the built-in memory store is an in-process implementation and is not durable across restarts or instances.

See [NENC security architecture](../ne/security/index.md) and [Server API](../api/server.md). Do not store passwords or long-lived credentials as plaintext payloads.

## Credential-vault authorization is not account authorization

EngineCookies can authorize whether a caller may use a **stored credential entry**. It does not log a website user in, validate a browser account-session cookie, create an account principal, or decide whether that account may read dashboard records. Use an application-owned identity/session provider or the NENC account-session policy for those tasks.

The default `EngineCookieMemoryStore` is process-local. Inject a durable, appropriately protected record store for production; do not assume sealed records survive restarts or are shared across server instances when using the default store.
