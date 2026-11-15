# Generation 3 Security Architecture

Generation 3 includes optional server-owned command infrastructure and data-protection helpers. These features are separate from browser-executable APIStatic routes.

## Security areas

| Area | Owner |
|---|---|
| Command manifest and dispatch | NENC |
| Command input validation | NENC command schema |
| Origin and destination policy | NENC origin helpers |
| Device proof | NENC device proof |
| Account/session policy | NENC session auth |
| Authorization and rate policy | NENC command security |
| Replay resistance | NENC replay guard |
| Sealed data and trust metadata | EngineCookies |
| Cross-origin policy | EngineCORS |

## Safe architecture

```text
browser client
    │ authenticated request
    ▼
NENC dispatcher
    ├── origin validation
    ├── session / device proof
    ├── command authorization
    ├── replay / rate policy
    └── validated command handler
             │
             ▼
       server-owned resources
```

Private credentials, database access and privileged logic remain server-side. A browser bundle must not contain server handler modules or secrets.

See [NENC](../../module/nenc.md), [EngineCookies](../../module/engine-cookies.md), [EngineServer](../../module/engine-server.md) and [EngineCORS](../../module/engine-cors.md). The longer [networking, credentials and security guide](../../networking-credentials-security.md) remains available for deeper details.


See also: [EngineCORS](../../module/engine-cors.md) and [EngineCookies](../../module/engine-cookies.md).
