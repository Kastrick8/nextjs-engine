# Network API — NENC Client and EngineCookies

The `nextjs-engine/network` entrypoint contains the browser-facing command transport and device/cookie proof APIs. Server dispatch and enforcement live in `nextjs-engine/server`.

## Declare a server command

Command declaration files are build inputs scanned by the NENC compiler. `EngineCommand.create()` aliases `registerEngineCommand()`; it registers the definition and returns a handle.

~~~ts
// src/server/commands.ts
import { EngineCommand } from "nextjs-engine/network";

export const privateSearchCommand =
  EngineCommand.create<{ search: string }, Response>(
    "catalog.privateSearch",
    {
      run: "server",
      auth: "account",
      permissions: ["catalog.read"],
      input: {
        search: { type: "string", maxLength: 120 }
      },
      async execute({ input, api, principal }) {
        const response = await api.resolveRequest({
          input: { search: input.search }
        });

        if (!response.ok) {
          return Response.json(
            { error: "backend_unavailable" },
            { status: 502 }
          );
        }

        return Response.json({
          account: principal,
          items: await response.json()
        });
      }
    }
  );
~~~

The `execute()` implementation runs on the server. Keep command declarations out of client bundles; the plugin extracts their static metadata into separate client/server manifests.

## Connect the client transport

The NENC plugin generates `NENC_CLIENT_MANIFEST` in `.nextjs-engine/nenc/client.ts`. Connect it in a client-only module:

~~~ts
"use client";

import {
  EngineCommand,
  EngineDeviceKey,
  configureEngineCommandTransport,
  createNENCTransport,
  type NENCClientManifest
} from "nextjs-engine/network";

export async function connectPrivateSearch(
  manifest: NENCClientManifest
) {
  const deviceKey = await EngineDeviceKey.create();

  configureEngineCommandTransport(
    createNENCTransport(manifest, { deviceKey })
  );

  return {
    deviceIdentity: deviceKey.identity,
    search: (search: string) =>
      EngineCommand.run("catalog.privateSearch", { search })
  };
}
~~~

The transport resolves the command name against the generated manifest, encodes its wire arguments and posts JSON to the generated route with command-selector, nonce and timestamp headers. With a device key supplied it signs the method, target, origin, body hash, timestamp and nonce using a non-exportable ECDSA P-256 key.

## EngineCookies and device identity

`EngineDeviceKey.create()` generates a non-exportable ECDSA P-256 private key and a public identity. The public API also exports proof encoding/decoding, value hashing, identity checks and proof verification.

`EngineCookies` exposes an index, trust-list factory, AES-256-GCM vault and record-store contract.

~~~ts
import {
  EngineCookieVault,
  EngineCookieMemoryStore
} from "nextjs-engine/network";

const vault = await EngineCookieVault.create({
  store: new EngineCookieMemoryStore()
});

await vault.seal({
  alias: "session-reference",
  owner: "https://app.example.com",
  creator: "private-search",
  purpose: "server-side session reference",
  expiresAt: Date.now() + 60 * 60 * 1000,
  binding: "none"
}, "opaque-session-reference");
~~~

This uses the in-memory store to demonstrate the interface only. It is not durable across restarts or instances. Production deployments need a persistent `EngineCookieRecordStore` and key management for a stable non-exportable AES-GCM key. The vault authenticates registration metadata as AES-GCM additional data and can require origin trust and device proof.

## Security boundary

- Client transport/manifests contain no server handler implementation.
- The server dispatcher enforces the configured origin, session, device-proof, input, authorization, rate and replay policies.
- Authentication does not automatically grant every permission.
- Keep backend credentials and server-only database access out of client modules.
- Do not treat an in-memory store as production persistence.

See [Server API](./server.md), [NENC configuration](../configuration/nenc.md), [EngineCookies module](../module/engine-cookies.md) and [security architecture](../ne/security/index.md).
