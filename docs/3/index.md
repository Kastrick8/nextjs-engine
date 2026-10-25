# Generation 3 Documentation

> **Generation:** 3.x alpha · **Source branch:** `main-3`

For Gen 3 evaluation, development, and migration. Gen 3 is not the stable 2.x contract.

| Need | Guide |
|---|---|
| Use styling props | [Styling — simple](./styling.md) |
| Understand style compilation and collection | [Styling — detailed](./styling-detailed.md) |
| Understand the compiler and server-first model | [Gen 3 overview](../gen3/overview.md) |
| Detailed compiler, runtime profiles, artifact cache, budgets, and security | [Compiler deep dive](./compiler-deep-dive.md) |
| Compiler, server rendering, and scheduler internals | [Phase A + B](../gen3/phase-a-b.md) |
| Browse all documentation | [Main docs index](../index.md) |

Gen 3 compiles schema pages into an execution plan, renders durable markup on the server, and keeps browser-owned behavior in narrower client islands. Styling has a dedicated compiler in `src/engine/compiler/EngineStyleCompiler.ts`.
