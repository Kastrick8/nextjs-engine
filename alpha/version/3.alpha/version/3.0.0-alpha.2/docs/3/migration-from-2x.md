# Migrating from Generation 2.6 to Generation 3

> **GENERATION 3 · ALPHA** · nextjs-engine 3.0.0-alpha.1

Generation 3 changes how schemas become rendered output and how some configuration is
compiled. Treat this as a major-generation migration, not a promise that every 2.6
integration has identical behavior.

## Development diagnostics

Run npm run dev. The Engine plugin emits one-time diagnostics for migration cases it can
identify safely. Each diagnostic includes a code and severity, the source file and line
where applicable, an explanation, and a suggested action.

The initial catalog covers unsupported RawComponentRenderer / type: "raw" usage, the
EngineAPI output-path migration, explicit use of the legacy client-renderer mode, and
named handlers that select the provider compatibility path. The catalog is explicit:
an unknown prop is not automatically called deprecated, because guessing causes false
positives. Add new verified API changes as specific rules with an actionable replacement.

## EngineAPI output migration

Generation 3 compiles provider inputs in .EngineAPIConfig/*.api to:

~~~text
.nextjs-engine/config/.apiconfig.json
~~~

The .api source files remain in place; the source directory is not renamed or moved.
If .engine-api-compiled.json exists from an older combined-plugin setup, the Gen 3
plugin retires that stale generated artifact after compiling the new output.

When detected during development, W3M001 identifies the installed package version and
new path. Keep editing .api inputs and use .nextjs-engine/config/.apiconfig.json for the
Generation 3 compiled configuration.

## Unsupported raw schema rendering

RawComponentRenderer and schema nodes with type: "raw" are not supported Generation 3
public APIs. Replace them with a normal React component registered through
createComponent() / registerComponent(), or render JSX inside an application component
instead of placing executable component code into schema data. These produce E3M001 and
E3M002 errors.

## Legacy renderer and handlers

Setting compiler.serverFirst to false opts a page into the Generation 2 client-renderer
compatibility path. It is a supported migration escape hatch; remove the override when a
page is ready for the default Generation 3 server-first renderer. W3M002 reports it.

Named handlers in createPage() keep the provider compatibility path because that API
assumes a shared client-owned registry. This is compatibility behavior, not a removed
API. W3M003 explains the rendering consequence and suggests component/slot boundaries
when full server-first rendering is the goal.

## Test the diagnostics

Run npm run test:migration. The smoke test covers the EngineAPI warning, unsupported raw
APIs, legacy renderer and named-handler warnings, deduplication, and a clean project.

For current APIs, see the [Generation 3 index](./index.md). For the stable Generation 2
contract, see the [Generation 2 docs](../2/index.md).
