# Configure NENC

NENC is an opt-in server-owned command transport. It connects a declared command manifest to a server handler module and enforces the configured origin, session, device and command-security boundary.

The repository's `withEngine()` plugin accepts an optional `nenc` configuration object. A source-checkout example is:

```js
const withEngine = require("./src/engine/plugins/enginePlugin");

module.exports = withEngine(nextConfig, {
  nenc: {
    commandFiles: ["src/server/commands.ts"],
    handlerModule: "src/server/nenc.server.ts",
    seed: process.env.ENGINE_NENC_SEED,
    buildId: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA
  }
});
```

| Option | Purpose |
|---|---|
| `commandFiles` | Source files declaring the server command manifest |
| `handlerModule` | Server-only command handler module |
| `seed` | Build-time NENC seed; keep stable and private where required by the deployment design |
| `buildId` | Build identity associated with the generated command manifest |

## Security boundaries

- Command handlers execute on the server.
- Browser code must not import the handler module or hold server secrets.
- Validate command input at the server boundary.
- Configure trusted origins, authentication, authorization, replay protection and rate policy deliberately.
- Never commit a real seed or credential to source control.

For the request protocol and security model, see [NENC module](../module/nenc.md) and [NE security architecture](../ne/security/index.md).
