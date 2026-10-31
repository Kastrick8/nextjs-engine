# EngineProvider

EngineProvider supplies the React context and collected-style integration used by provider-backed Engine hooks and rendering features.

## Typical use

```tsx
import { EngineProvider } from "nextjs-engine";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <EngineProvider>{children}</EngineProvider>
      </body>
    </html>
  );
}
```

Use the provider where the relevant Engine APIs require context. Do not add nested providers indiscriminately; a provider boundary can establish a distinct context and style collection scope.

## Related hooks

The public API includes `useEngineContext()`, `useBreakpoint()` and `useMinBreakpoint()`. Other hooks are owned by EngineScroll, EngineBrowser, EngineModel, EngineScheduler and EngineViewport.

See [Hooks API](../api/hooks.md) and [Styling](./styling.md).
