# Server-only API

Generation 3 exposes a separate server entrypoint. Import request-aware helpers from `nextjs-engine/server`; do not pull server-only APIs into a client component or a browser bundle.

```ts
import {
  EngineServer,
  getServerDevice,
  EngineCORS
} from "nextjs-engine/server";

const server = await EngineServer.open();
const device = await getServerDevice();

const cors = EngineCORS.create({
  allow: ["https://app.example.com"],
  methods: ["GET", "POST"]
});
```

## Export families

| Family | Exports |
|---|---|
| Request/session | `EngineServer`, `EngineServerSession` |
| Device | `getServerDevice()`, `detectDevice()` |
| CORS | `EngineCORS`, `EngineCORSRuleSet` |
| NENC commands | command lookup, validation, execution and inspection |
| NENC dispatch | dispatcher and command API resolver factories |
| Device proof | device-signature verifier factory |
| Session policy | NENC account session policy and token hashing |
| Security | command security policy, rate limiter and memory stores |
| Replay | replay guard and memory replay store |

The detailed feature contracts belong in [EngineServer](../module/engine-server.md), [EngineCORS](../module/engine-cors.md), [EngineCookies](../module/engine-cookies.md) and [NENC](../module/nenc.md).

> [!WARNING]
> These APIs depend on the Next.js request/server runtime and Web Crypto. Do not import the server entrypoint from a `"use client"` module.
