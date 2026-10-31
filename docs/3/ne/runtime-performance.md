# Runtime and Performance — Generation 3

Generation 3 uses server-first compilation for eligible page schemas, feature-aware fallback planning, optional client islands and runtime scheduling. The gains depend on the shape of the page and which features are actually used; this guide describes the mechanisms rather than promising fixed speedups.

## 1. Keep the server/client boundary deliberate

- Use schema-driven pages and built-in components where they satisfy the UI.
- Add client-owned interaction only for the features that need browser state or event handlers.
- Keep filesystem reads, provider secrets, authentication and privileged handlers in server/build code.
- Use the compatibility renderer only when a page still requires that contract.

See [Compiler](./compiler/index.md) and [Server API](../api/server.md).

## 2. Defer non-critical work

Use LazyMount/LazySection or a component's supported lazy behavior for large sections that do not need to mount immediately. Avoid wrapping every element; lazy boundaries have a cost and should correspond to meaningful content or interaction groups.

## 3. Let responsive styles stay in CSS

When a style property supports responsive values, use a breakpoint object rather than wiring a resize listener to update style state.

~~~ts
{
  type: "grid",
  props: {
    columns: { xs: 1, md: 2, xl: 3 },
    gap: { xs: "1rem", md: "1.5rem" }
  }
}
~~~

## 4. Understand scheduler priorities

EngineScheduler coordinates eligible work using policy and visibility information. Work categories include critical, visible, near, deferred, idle and sleeping classes. They are scheduling decisions, not guarantees that a particular task runs at a specific millisecond.

## 5. Use each media system's lifecycle

- EngineImage can defer loading until its visibility rules are met.
- EngineVideo has its own viewport/playback lifecycle.
- EngineScroll observers and trackers should be scoped to the interactions that need them.
- EngineShader runs through its scheduling/runtime layer; avoid continuously changing inputs when the visual output does not need to update.

## 6. Measure rather than guessing

A practical investigation sequence:

1. Reproduce on the target route and browser.
2. Identify whether the cost is server render, client hydration, JS execution, layout/paint, media transfer or a long-running animation.
3. Inspect Engine compiler/diagnostic output and EngineDebug where enabled.
4. Disable one subsystem at a time to isolate the source.
5. Re-test with the same viewport, route data and device profile.

Do not compare runs with different data, cache state or device conditions and attribute the entire difference to one Engine feature.

## Related

- [Runtime architecture](./runtime.md)
- [NE-CLI](./cli/index.md)
- [EngineScheduler](../module/engine-scheduler.md)
- [EngineViewport](../module/engine-viewport.md)
- [EngineScroll](../module/enginescroll.md)
