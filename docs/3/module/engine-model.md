# EngineModel

EngineModel is the Generation 3 shared state/subscription system exposed by the public API.

## Public surface

- `EngineModel`
- `useEngineModel()`
- `useEngineModelValue()`
- Model action, state, listener and inspection types

## Responsibilities

The model provides a named state surface, subscription notifications and inspection methods for supported consumers. It is designed to separate shared Engine state from individual component-local React state.

## Usage direction

Use the public hooks from React components and use the model API for the corresponding Engine state lifecycle. Keep application state ownership explicit: EngineModel is not a replacement for every application store or server database.

See [Hooks API](../api/hooks.md) and [Runtime](../ne/runtime.md). Exact action payloads and state types should be read from the exported TypeScript declarations for the installed version.
