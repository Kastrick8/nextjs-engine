# Configure NENC — Generation 3

NENC is an opt-in server-owned command transport. Its plugin extracts static command declarations and creates separate client/server manifests plus a generated App Router route.

## 1. Declare a command

~~~ts
// src/server/commands.ts
import { EngineCommand } from "nextjs-engine/network";

export const searchCommand = EngineCommand.create<{ search: string }, Response>(
  "catalog.privateSearch",
  {
    run: "server",
    auth: "account",
    permissions: ["catalog.read"],
    input: { search: { type: "string", maxLength: 120 } },
    async execute({ input, api }) {
      return api.resolveRequest({ input: { search: input.search } });
    }
  }
);
~~~

The declaration is scanned during build; `execute()` runs on the server. Keep command declarations out of client bundles.

## 2. Configure the plugin

~~~js
const withEngine = require("./src/engine/plugins/enginePlugin");

module.exports = withEngine(nextConfig, {
  nenc: {
    commandFiles: ["src/server/commands.ts"],
    handlerModule: "src/server/nenc.server.ts",
    seed: process.env.ENGINE_NENC_SEED,
    buildId: process.env.VERCEL_GIT_COMMIT_SHA
  }
});
~~~

| Option | Purpose |
|---|---|
| `commandFiles` | Project-relative JavaScript/TypeScript files declaring commands |
| `handlerModule` | Server-only module exporting the handler factory |
| `seed` | Seed used to compile the command manifest |
| `buildId` | Build identity included with the manifest |
| `outputDir` | Generated manifests; default `.nextjs-engine/nenc` |
| `appDir` | App Router directory; default `app` |
| `generateRoute` | Enables generated command route; true by default |

When route generation is enabled, `handlerModule` is required and must resolve to a file inside the project root. The plugin generates `client.ts`, `server.ts`, `manifest.json` and the command route; do not edit generated artifacts manually.

## 3. Connect the client

The generated client module exports `NENC_CLIENT_MANIFEST` from `.nextjs-engine/nenc/client.ts`. Use it with `createNENCTransport()` and `configureEngineCommandTransport()` in a client-only module. See [Network API](../api/network.md).

## Security

Keep handlers, signing seeds and backend credentials server-side. Validate input and authorize permissions on the server. Configure trusted origins, session checks, optional device proof, rate limits and replay protection. Authentication alone is not authorization.

See [NENC module](../module/nenc.md) and [security architecture](../ne/security/index.md).
