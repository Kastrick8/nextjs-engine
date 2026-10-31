# Public Hooks — Generation 2

| Area | Hooks |
|---|---|
| Provider/context | useBreakpoint(), useMinBreakpoint(), useEngineContext() |
| Visibility | useInView(), useImageInView(), useSectionInView(), useVisibleInView() |
| Browser | useBrowser() |
| Device | useMobileDevice() |
| Scroll | useEngineScroll(), useEngineScrollTimeline() |
| Canvas | useEngineCanvas() |

Call hooks only from React components or other hooks. Provider-backed hooks require EngineProvider context. Request-aware server functions are not React hooks; use the [Server API](./server.md).

Related guides: [EngineProvider](../module/engine-provider.md), [EngineBrowser](../module/enginebrowser.md), [EngineScroll](../module/enginescroll.md) and [EngineCanvas](../module/enginecanvas.md).
