# NE — Next.js Engine Internals

This section explains how the Engine is assembled and operated. It is intentionally separate from [Modules](../module/index.md), which describe the developer-facing capabilities.

| Area | Reference |
|---|---|
| Architecture and lifecycle | [Architecture](./architecture.md) |
| Compiler, execution plans and artifacts | [Compiler](./compiler/index.md) |
| Scheduling, model, viewport and rendering lifecycle | [Runtime](./runtime.md) |
| Browser support and fallback policy | [Compatibility and hardening](./compatibility.md) |
| EngineDebug workbench | [Debugging](./debug/index.md) |
| NENC server command boundary | [Security](./security/index.md) |
| Error reporting and error code book | [Errors](./errors/index.md) |
| NE-CLI executable and updater | [NE-CLI](./cli/index.md) |

## Reading the internals

Public API signatures live in [API](../api/index.md). A module's public behavior lives in its module guide. NE pages explain the implementation pipeline, ownership boundaries, runtime orchestration and operational behavior.

Internal source files are grouped by subsystem. A source file does not automatically receive a separate documentation page.
