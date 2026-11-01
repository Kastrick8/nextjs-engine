# EngineProvider

EngineProvider supplies the React context and per-boundary style collector used by provider-backed Engine hooks and rendering features. It is not, by itself, the component that emits the provider's collected stylesheet.

## Typical context usage

```tsx
import type { ReactNode } from "react";
import { EngineProvider, useEngineContext } from "nextjs-engine";

function ContextReadout() {
  const { config } = useEngineContext();
  return <p>Content width: {config.contentMaxWidth}</p>;
}

export function EngineContextBoundary({ children }: { children: ReactNode }) {
  return (
    <EngineProvider config={{ contentMaxWidth: "1100px" }}>
      {children}
      <ContextReadout />
    </EngineProvider>
  );
}
```

Use the provider when an API needs Engine context or when the application intentionally establishes a distinct config/handler/slot boundary. Do not add nested providers indiscriminately; each provider can establish a separate style-collection scope.

## Related hooks

The public API includes `useEngineContext()`, `useBreakpoint()` and `useMinBreakpoint()`. Other hooks are owned by EngineScroll, EngineBrowser, EngineModel, EngineScheduler and EngineViewport.

## Provider and generated styles

The provider owns a `StyleCollector`, but the provider alone does not emit the collected CSS. The internal `EngineCollectedStyles` helper is not a public `nextjs-engine` root export. The built-in `createPage()` and schema-backed `createComponent()` paths manage their own provider/style emission.

For custom React composition, do not import internal source paths just to gain access to `EngineCollectedStyles`. Use the schema-backed factory for a self-contained Engine region, or follow [detailed styling](../styling-detailed.md) for the public style helpers and collector responsibilities.

## Generation 2 compatibility

Gen 2 also exports `EngineProvider`, but does not include the Gen 3 scoped `registry` provider contract or compiler/server-first renderer. Do not pass a Gen 3 `EngineComponentRegistry` into a Gen 2 provider. That type/class/factory is absent in Gen 2 and importing it there fails type resolution. See [Migrating from Gen 2](../guides/migrating-from-gen2.md).
