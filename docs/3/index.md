# Generation 3 Documentation

<badge>3.x alpha</badge> <badge>Source: main-3</badge>

This reference describes the implementation currently present on `main-3`. Generation 3 introduces a compiler-first, server-first rendering path and is not the stable Generation 2 contract.

## Start here

| Goal | Read |
|---|---|
| Understand the generation and rendering model | [NE architecture](./ne/architecture.md) |
| Create pages, components, schemas and themes | [Create API family](./api/create.md) |
| Browse all Engine systems | [Module catalog](./module/index.md) |
| Configure external APIs and static endpoints | [Configuration guide](./configuration/index.md) |
| Understand compilation and server rendering | [Compiler documentation](./ne/compiler/index.md) |
| Understand runtime scheduling and state | [Runtime documentation](./ne/runtime.md) |
| Run the Engine command line | [NE-CLI](./ne/cli/index.md) |
| Build a first page | [Getting started](./guides/getting-started.md) |

## Documentation categories

- [Modules](./module/index.md) — public Engine capabilities, components and cohesive systems.
- [API](./api/index.md) — public functions, API families, hooks and server entrypoints.
- [NE](./ne/index.md) — internal architecture and operational tooling.
- [Configuration](./configuration/index.md) — how to configure Engine subsystems in a project.
- [Guides](./guides/index.md) — complete task-based workflows.
- [Integrations](./integrations/index.md) — Next.js and application integration.

## Generation 3 boundaries

Generation 3 includes the compiler/runtime foundation, EngineTheme, EngineSEO, EngineDebug, NENC, EngineCookies, server helpers, and the expanded NE-CLI. These are documented only here when they are not part of the Generation 2 implementation.

> [!WARNING]
> Do not assume a Generation 2 page, config file, component prop or runtime guarantee applies to Generation 3. Use the matching source branch and the versioned reference for the installed package.
