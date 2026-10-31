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
