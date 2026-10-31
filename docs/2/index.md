# Generation 2 Documentation

**2.x stable line** · Source branch: main-2

This reference describes the implementation maintained on main-2. Generation 2 is the stable 2.x architecture; Generation 3 is a separate compiler-first line with its own API contract.

## Start here

| Goal | Read |
|---|---|
| Create a schema-driven page | [Getting started](./guides/getting-started.md) |
| Browse public Engine systems | [Module catalog](./module/index.md) |
| Discover public functions and hooks | [API reference](./api/index.md) |
| Configure external HTTP providers | [EngineAPIResolver](./configuration/engine-api.md) |
| Configure compiled browser endpoints | [APIStatic](./configuration/api-static.md) |
| Configure page-level Engine settings | [Engine configuration](./configuration/engine-config.md) |
| Understand runtime behavior | [NE runtime](./ne/runtime.md) |
| Run the newly introduced CLI | [NE-CLI](./ne/cli/index.md) |

## Documentation categories

- [Modules](./module/index.md) — application-facing Engine capabilities.
- [API](./api/index.md) — canonical factory, registry, hook and server exports.
- [NE](./ne/index.md) — architecture, runtime, diagnostics and command-line tooling.
- [Configuration](./configuration/index.md) — practical project setup, file formats and environment values.
- [Guides](./guides/index.md) — task-oriented instructions.
- [Integrations](./integrations/index.md) — Next.js project integration.

Generation 2 does not include the Generation 3 compiler, EngineTheme runtime/factory, EngineSEO, EngineDebug, NENC, EngineCookies, EngineCORS, EngineScheduler, EngineModel or EngineViewport.

Existing migration and release materials remain in the repository for maintenance and website use; they are not part of this navigation. The existing examples directory is unchanged.
