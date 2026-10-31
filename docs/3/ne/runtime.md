# Generation 3 Runtime

The runtime coordinates state and browser work after a page has been compiled and rendered. Its public systems include EngineScheduler, EngineModel and EngineViewport; their application-facing contracts are documented in [Modules](../module/index.md).

## Runtime responsibilities

| System | Role |
|---|---|
| EngineScheduler | Schedules work by policy and publishes scheduling snapshots |
| EngineModel | Stores shared Engine state and notifies subscribers |
| EngineViewport | Publishes viewport snapshots used by rendering and visibility behavior |
| EngineProvider | Supplies React context and collected styles |
| EngineScroll runtime | Coordinates scroll points, navigation, timelines and observers |
| Style collector | Collects and deduplicates generated styles within its owning render context |
| Lazy mounting | Defers supported component work until viewport/lifecycle criteria are met |

## Typical lifecycle

```text
server plan
   ↓
server-owned HTML
   ↓
provider and client hydration
   ↓
viewport / visibility observation
   ↓
scheduler chooses eligible work
   ↓
components and interactions activate
```

This is a conceptual lifecycle. Not every component participates in every stage, and React state, route changes and context updates can still cause re-renders.

## Performance boundaries

- Lazy-loading is declared per component/registry entry; it does not automatically apply to arbitrary DOM elements.
- Responsive style props use CSS media rules rather than a JavaScript resize loop where the property supports responsive values.
- Image, video, scroll and shader systems have their own activation policies.
- Profile the application route before assuming a specific optimization applies.

See [Runtime and performance](../runtime-performance.md) and the [module catalog](../module/index.md).
