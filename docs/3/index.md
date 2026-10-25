# Generation 3 — Start Here

> **Generation:** 3 · **Version:** v3.0.0-alpha.1 · **Source:** `main-3` · **Level:** Simple overview

Generation 3 is the compiler-first, server-first development line. It keeps the schema authoring model, but compiles a schema into a plan before rendering. The plan helps the Engine decide which nodes can remain static or server-rendered, which browser features are needed, what assets are used, and which client work can be delayed.

**Gen 3 is an alpha line, not the stable v2 contract.** Test migrations separately before moving a production app from v2.

## Start with a task

| I want to… | Read |
| --- | --- |
| Create a first Gen 3 page | [Getting started](./getting-started.md) |
| Understand the compiler in simple terms | [Compiler basics](./compiler.md) |
| Style components | [Styling basics](./styling.md) |
| Understand compiler internals | [Detailed compiler internals](./detailed/compiler-internals.md) |
| Read compiler and scheduler detail | [Compiler and scheduler](./detailed/compiler-and-scheduler.md) |
| Read NENC, EngineCookies, and request security | [Network and credentials](./detailed/network-and-credentials.md) |
| Read browser compatibility and EngineDebug detail | [Compatibility and hardening](./detailed/compatibility-and-hardening.md) |
| Browse component APIs | [Component reference](./components/index.md) |
| Read alpha release notes | [Release history](./release/index.md) |

## Gen 3 in one diagram

```text
PageSchema
   ↓
compilePage()
   ↓
EngineCompiledPage / enginePlan
   ├─ static / server / client ownership
   ├─ work priority
   ├─ used-feature manifest, assets, fallback plan, diagnostics
   ↓
EngineServerRenderer
   ↓
server-rendered output + client islands where browser behavior is required
```

Next.js still compiles and bundles the application. The Engine compiler adds a schema-specific planning and rendering stage; it does not replace Next.js's compiler/bundler.

For stable v2 apps, use [Generation 2 documentation](../2/index.md).
