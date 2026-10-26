# Migrating from Generation 2.6 to Generation 3

> **GENERATION 3 · ALPHA** · nextjs-engine 3.0.0-alpha.1

Generation 3 changes how schemas become rendered output and how some configuration is
compiled. Treat this as an explicit major-generation migration, not a drop-in promise
that every 2.6 integration has identical behavior.

## Development diagnostics

Run npm run dev. The Engine plugin emits a one-time diagnostic for known migration
cases it can identify safely. Each source diagnostic names its code, severity, file and
line, explains the incompatible API, and recommends an action. The initial catalog
covers unsupported RawComponentRenderer / type: "raw" usage and the EngineAPI output
migration. The catalog is intentionally explicit: an unknown prop is not automatically
called deprecated, because that would produce false positives.

## EngineAPI output migration

Generation 3 compiles the existing provider input files in .EngineAPIConfig/*.api to:

~~~text
.nextjs-engine/config/.apiconfig.json
~~~

The .api source files remain in place; the source directory is not renamed or moved.
If .engine-api-compiled.json exists from an older combined-plugin setup, the Gen 3
plugin retires that stale generated artifact after compiling the new output.

When the legacy layout is detected during development, the console shows a W3M001
warning that includes the installed package version and the new compiled path. Keep
editing the .api inputs and have Gen 3 runtime/build code read the new output path.

## Unsupported raw schema rendering

RawComponentRenderer and schema nodes with type: "raw" are not supported Gen 3
public APIs. Replace them with a normal React component registered through
createComponent() / registerComponent(), or render JSX inside an application
component rather than trying to place executable component code into schema data.
The development diagnostics report these as E3M001 and E3M002.

## Rendering model

createPage() is still the normal entry point. Eligible schema pages now use the
Generation 3 compiler and server-first renderer. Pages that use named handlers still
have a documented compatibility path; do not assume every such route gets the full
server-first execution plan. See the [Generation 3 overview](../gen3/overview.md).

For current API details, use the [Generation 3 documentation index](./index.md).
For the stable Generation 2 contract, use the versioned [Generation 2 docs](../2/index.md).
