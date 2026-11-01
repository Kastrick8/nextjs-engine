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


## Provider and generated styles

`EngineProvider` exposes React context/config/handlers/slots and owns a `StyleCollector`, but the provider alone does not emit the collected CSS. The internal `EngineCollectedStyles` helper is not a public `nextjs-engine` root export. The built-in `createPage()` and schema-backed `createComponent()` paths manage their own provider/style emission.

For custom React composition, do not import internal source paths just to gain access to `EngineCollectedStyles`. Use the schema-backed factory for a self-contained Engine region, or follow [detailed styling](../styling-detailed.md) for the public style helpers and collector responsibilities.

## Generation 2 compatibility

Gen 2 also exports `EngineProvider`, but does not include the Gen 3 scoped `registry` provider contract or compiler/server-first renderer. Do not pass a Gen 3 `EngineComponentRegistry` into a Gen 2 provider. That type/class/factory is absent in Gen 2 and importing it there fails type resolution. See [Migrating from Gen 2](../guides/migrating-from-gen2.md).
