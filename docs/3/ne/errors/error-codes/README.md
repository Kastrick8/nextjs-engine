# Nextjs Engine Error Code Book — Generation 3

This is the authoritative long-form reference for Generation 3 diagnostics. It follows the [RBE Error Code Book](https://kastrick.vercel.app/project/rbe/doc/error-codes): short terminal messages use stable codes; this book provides meaning, likely cause and repair guidance.

Machine-readable index: [catalog.json](./catalog.json). Public help routes use `https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/<subsystem>#<lowercase-code>`.

## Format and subsystem index

Codes use an uppercase subsystem prefix followed by four decimal digits: `PREFIX1234`.

| Prefix | Area | Book |
| --- | --- | --- |
| `NECORE` | Structured reports, route/global boundaries, request instrumentation and Node fatal exceptions | [Global reporting and Next.js boundaries](core.md) |
| `NENC` | Gen 3 source discovery, static analysis, compilation, client islands, artifacts and worker output | [NENC compiler and worker pipeline](nenc.md) |
| `NECFG` | Config parsing, generated error files, plugin lifecycle and file ownership | [Configuration and plugin integration](config.md) |
| `NEBLD` | Build integration, deterministic artifacts, cache validation, budgets and output writes | [Build, cache and artifacts](build.md) |
| `NECMP` | Schema validation, custom component registration, props and node identity | [Schema and component contracts](components.md) |
| `NETH` | Theme IDs/scopes, tokens, .etr artifacts, fonts and remote loading | [EngineTheme and remote themes](theme.md) |
| `NEMD` | Markdown parsing, GFM, server rendering, highlighting and link decoration | [EngineMarkdown](markdown.md) |
| `NEIMG` | Image source, sizing/optimization, fallback loading and remote host rules | [EngineImage and media](images.md) |
| `NEAPI` | Provider config, route declarations, request validation and handler execution | [EngineAPI and APIStatic](api.md) |
| `NESCHED` | Scheduling policies, target lifecycle, observers, callbacks and frame budgets | [EngineScheduler and runtime coordination](scheduler.md) |
| `NEDEBUG` | Dev route discovery, preview navigation, source mapping and production isolation | [EngineDebug workbench and preview](engine-debug.md) |
| `NESEO` | Metadata normalization, canonical URLs, JSON-LD and sitemaps | [EngineSEO and metadata](seo.md) |
| `NENET` | Command transport, session/CSRF checks, replay controls, backend requests and Web Crypto | [NENC networking and private sessions](networking.md) |
| `NEMIG` | Legacy configuration, renderer compatibility and source migration | [Generation 2 to Generation 3 migration](migration.md) |
| `NEVIS` | Visual rendering, shaders, animation, scroll state and transition lifecycle | [Visual runtime: Canvas, Shader, Manim, Scroll and transitions](visual.md) |
| `NESEC` | Origin checks, identity/device proof, unsafe values and secret-safe reporting | [Security and diagnostic redaction](security.md) |

## Numeric convention

- **1xxx** input/source discovery/parsing/validation.
- **2xxx** semantics/configuration/policy/authorization.
- **3xxx** compilation/lowering/artifact preparation.
- **4xxx** runtime operations/lifecycle.
- **5xxx** workers/process/package/build/bootstrap.
- **8xxx** external dependency/browser/network/platform.
- **9xxx** internal invariants, usually a likely Engine defect.

## Status labels

- **Emitted**: a current source path emits this code.
- **Assigned**: the code/meaning are fixed for a staged reporting path; current source may not emit it yet.
- **Reserved**: set aside for a future invariant/migration diagnostic. Never reuse it.

A documented code is not automatically a live diagnostic. Respect the status field.

## Terminal diagnostic contract

Where context exists, a report should include code, concise message, reason, action, source file/line/column, a code-specific help link and the Kastrick project page:

```text
[NENC] FAILED [NENC4000] Compile task failed
  reason: NENC received a failure without a narrower diagnostic.
  action: Inspect the first preceding compiler failure.
  help: https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/nenc#nenc4000
  project: https://kastrick.vercel.app/project/nextjs-engine
```

The global reporter emits ANSI colors only when supported, respects no-color settings, redacts token-like secrets, and keeps a plain-text fallback. Machine-readable fields are preserved separately from the presentation string.

## Maintenance contract

1. Add a code/page alongside the emitter that introduces it.
2. Never recycle a code after emission/publication.
3. Mark not-yet-integrated behavior **Assigned**, not **Emitted**.
4. Explain what, why and how to fix it; prefer the earliest useful source location.
5. Never log cookies, tokens, session proof, private keys or signed URL query values.
6. Keep the catalog, page anchors, runtime lookup and smoke tests synchronized.

Run `npm run test:error-book`. See [Global error handling](../global-error-handling.md), the [Gen 3 docs index](../index.md), and the [Kastrick Nextjs Engine project page](https://kastrick.vercel.app/project/nextjs-engine).
