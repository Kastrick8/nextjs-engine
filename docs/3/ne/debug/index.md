# EngineDebug

EngineDebug is the Generation 3 development workbench for inspecting Engine routes, diagnostics and runtime behavior. Its implementation lives in src/engine/debug/ and is integrated through the Engine Next.js plugin.

## Areas

| Area | Purpose |
|---|---|
| Route catalog | Identify routes and their Engine associations |
| Source and diagnostics | Show compiler and runtime diagnostics |
| Inspectors | Inspect component and runtime state where supported |
| Code actions | Suggest repair actions for recognized diagnostics |
| Dynamic route tools | Select and inspect dynamic route patterns |
| Isolation | Keep debug-only behavior out of ordinary route execution |
| Runtime monitor | Observe supported runtime events during development |

## Boundaries

EngineDebug is development tooling, not a production application API. The plugin controls when its routes and development helpers are installed. Do not depend on internal debug route paths as public application contracts.

See [Compatibility and debugging hardening](../../compatibility-debugging-hardening.md) for the broader diagnostics and isolation guidance.
