# EngineModel

EngineModel is the Generation 3 shared state/subscription system exposed by the public API.

## Public surface

- `EngineModel`
- `useEngineModel()`
- `useEngineModelValue()`
- Model action, state, listener and inspection types

## Typed usage

`EngineModel` stores a shallow, typed state object. Create one model instance and pass it to components that consume it:

```tsx
"use client";

import { EngineModel, useEngineModel, useEngineModelValue } from "nextjs-engine";

type DashboardState = { count: number; selectedTab: "overview" | "activity" };

export const dashboardModel = EngineModel.create<DashboardState>({
  count: 0,
  selectedTab: "overview",
}, { name: "dashboard" });

dashboardModel
  .computed("doubleCount", (state) => state.count * 2)
  .action("increment", (model, amount: number) => {
    model.update("count", (count) => count + amount);
  });

export function DashboardCounter() {
  const count = useEngineModelValue(dashboardModel, "count");
  const state = useEngineModel(dashboardModel);
  return (
    <button onClick={() => dashboardModel.run("increment", 1)}>
      {count} · {state.selectedTab}
    </button>
  );
}
```

`useEngineModel(model)` subscribes to the whole readonly state snapshot. `useEngineModelValue(model, key)` subscribes only to one key, so unrelated key updates do not notify that consumer.

## Model methods

| Method | Result | Purpose |
| --- | --- | --- |
| `EngineModel.create(initialState, options?)` / `new EngineModel(initialState, options?)` | `EngineModel<TState>` | Create a model; `options.name` supplies its inspection name |
| `get(key)` / `has(key)` | Value / `boolean` | Read a state key or test whether it exists |
| `set(key, value)` | `void` | Replace one value and notify affected listeners when it changes |
| `update(key, updater)` | `void` | Derive a replacement value from the current key value |
| `patch(values)` | `void` | Shallow-merge changed keys and notify once |
| `reset()` | `void` | Restore the initial shallow state |
| `snapshot()` / `getVersion()` | `Readonly<TState>` / `number` | Read current state and monotonically increasing change version |
| `computed(name, resolver)` / `read(name)` | Model / computed value | Register and evaluate a named derived value |
| `action(name, handler)` / `run(name, ...args)` | Model / action result | Register and invoke a named action with the model as its first argument |
| `watch(key, listener)` | `() => void` | Subscribe to one key; listener receives `(value, previous)` |
| `subscribe(listener)` | `() => void` | Subscribe to any state change |

`computed()` and `action()` are chainable. A computed resolver receives the current readonly state when `read()` is called; it is not automatically memoized. Unknown computed/action names throw.

Development-only inspection helpers include `inspect()`, `subscribeDebug()`, `registerDebugConsumer()`, and `debugSet()`. `inspect()`/`subscribeDebug()`/`debugSet()` reject production use; they are for local diagnostics, not application runtime state editing.

State updates replace the top-level object but do not deep-clone nested values. Treat nested objects as immutable and replace them when changing nested data.

## Responsibilities

The model provides a named state surface, subscription notifications and inspection methods for supported consumers. It is designed to separate shared Engine state from individual component-local React state.

## Usage direction

Use the public hooks from React components and use the model API for the corresponding Engine state lifecycle. Keep application state ownership explicit: EngineModel is not a replacement for every application store or server database.

See [Hooks API](../api/hooks.md) and [Runtime](../ne/runtime.md). Exact action payloads and state types should be read from the exported TypeScript declarations for the installed version.
