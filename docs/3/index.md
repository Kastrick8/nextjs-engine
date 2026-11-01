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
| Keep ordinary Next.js/React JSX | [React and JSX integration](./integrations/react-and-jsx.md) |
| Configure private account commands | [Authentication and authorization](./integrations/authentication-and-authorization.md) |
| Review the third-party ecosystem | [Third-party libraries](./integrations/third-party.md) |
| Migrate a Gen 2 application | [Gen 2 → Gen 3 migration](./guides/migrating-from-gen2.md) |

## Documentation categories

- [Modules](./module/index.md) — public Engine capabilities, components and cohesive systems.
- [API](./api/index.md) — public functions, API families, hooks and server entrypoints.
- [NE](./ne/index.md) — internal architecture and operational tooling.
- [Configuration](./configuration/index.md) — how to configure Engine subsystems in a project.
- [Guides](./guides/index.md) — complete task-based workflows.
- [Integrations](./integrations/index.md) — Next.js, React/JSX, security and application integration.

## Generation 3 boundaries

Generation 3 includes the compiler/runtime foundation, EngineTheme, EngineSEO, EngineDebug, NENC, EngineCookies, server helpers, and the expanded NE-CLI. These are documented only here when they are not part of the Generation 2 implementation.

> [!WARNING]
> Do not assume a Generation 2 page, config file, component prop or runtime guarantee applies to Generation 3. Some APIs are new, some contracts changed, and some Gen 3-only imports do not exist in Gen 2. Use the [Gen 2 → Gen 3 migration guide](./guides/migrating-from-gen2.md) and match the versioned reference to the installed package.
