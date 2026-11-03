# Generation 3 Runtime

The runtime coordinates state and browser work after a page has been compiled and rendered. Its public systems include EngineScheduler, EngineModel and EngineViewport; application-facing contracts live in [Modules](../module/index.md).

## Runtime responsibilities

| System | Role |
|---|---|
| EngineScheduler | Schedules eligible work and publishes snapshots |
| EngineModel | Stores shared Engine state and notifies subscribers |
| EngineViewport | Publishes viewport snapshots for rendering/visibility behavior |
| EngineProvider | Supplies React context and collected-style integration |
| EngineScroll runtime | Coordinates points, navigation, timelines and observers |
| Style collector | Collects and deduplicates generated styles within the render context |
| Lazy mounting | Defers supported component work until viewport/lifecycle criteria are met |

## Typical lifecycle

~~~text
server plan
   ↓
server-owned HTML
   ↓
provider and client hydration
   ↓
viewport / visibility observation
   ↓
scheduler selects eligible work
   ↓
components and interactions activate
~~~

This is a conceptual lifecycle. Not every component participates in every stage, and normal React state updates and route changes can still trigger re-renders.

## Performance boundaries

- Lazy behavior is declared per component/registry entry; it does not automatically apply to arbitrary DOM elements.
- Responsive style props use CSS media rules rather than a JavaScript resize loop where the property supports responsive values.
- Image, video, scroll and shader systems have their own activation policies.
- Profile the route and feature that is slow; do not assume that every module uses every optimization.

See [Runtime & Performance](./runtime-performance.md) and the [module catalog](../module/index.md).
