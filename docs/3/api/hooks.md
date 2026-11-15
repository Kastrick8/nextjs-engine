# Public Hooks

This page groups the public React hooks by the Engine system that owns them. A hook is documented here for discovery; its behavior and lifecycle belong to its module guide.

| Area | Hooks |
|---|---|
| Provider/context | `useBreakpoint()`, `useMinBreakpoint()`, `useEngineContext()` |
| Visibility | `useInView()`, `useImageInView()`, `useSectionInView()`, `useVisibleInView()` |
| Browser | `useBrowser()` |
| Device | `useMobileDevice()` |
| Scroll | `useEngineScroll()`, `useEngineScrollTimeline()` |
| Scheduler | `useEngineSchedule()`, `useEngineVisible()` |
| Model | `useEngineModel()`, `useEngineModelValue()` |
| Viewport | `useEngineViewport()` |
| Canvas | `useEngineCanvas()` |

> [!NOTE]
> The list is Generation 3's current export set. Generation 2 does not expose the Generation 3 Scheduler, Model or Viewport hooks.

## Usage notes

- Call hooks from React components or other hooks, following normal React rules.
- Provider-backed hooks require the corresponding provider context.
- Request-aware server functions are not React hooks; use the [server API](./server.md).
- Check the owning module reference for return values, subscriptions and lifecycle details.

## Related module guides

[EngineProvider](../module/engine-provider.md) · [EngineBrowser](../module/enginebrowser.md) · [EngineScroll](../module/enginescroll.md) · [EngineScheduler](../module/engine-scheduler.md) · [EngineModel](../module/engine-model.md) · [EngineViewport](../module/engine-viewport.md)
