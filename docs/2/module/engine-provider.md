# EngineProvider — Generation 2

> **Generation 2 · Stable 2.x** · This page describes the public provider contract on `main-2`.

`EngineProvider` supplies the React context consumed by Engine hooks and provider-aware components. Its props include:

- `config`: Engine breakpoints and layout defaults;
- `handlers`: named callbacks referenced by schema nodes;
- `slots`: named ReactNode values for schema slots;
- `styleCollector`: an optional collector instance;
- `children`: the React subtree that consumes the context.

The provider is exported from `nextjs-engine`:

```tsx
"use client";

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

The context is available through public hooks such as `useEngineContext()`, `useBreakpoint()`, and `useMinBreakpoint()`. A provider boundary can establish distinct config, handlers, slots and style-collection scopes.

## Style collection is not automatic for arbitrary provider usage

The provider owns a `StyleCollector`, but `EngineProvider` alone does not render the collected CSS. The internal `EngineCollectedStyles` helper is not a public root export of the installed package. The built-in `createPage()` and schema-backed `createComponent()` factories manage the provider and collected-style emission for their own rendering boundary.

For a schema-rendered component embedded in normal JSX, use `createComponent()` instead of importing a private `src/engine/providers/EngineProvider` path to access internal helpers. Do not assume that wrapping an arbitrary application tree in `EngineProvider` alone completes SSR style emission. See [React and JSX integration](../integrations/react-and-jsx.md) and [Styling](./styling.md).

## Generation 3 migration

Gen 3 retains `EngineProvider` but adds a scoped component registry to the provider contract and changes the default eligible `createPage()` path to compiler-first/server-first rendering. Do not assume Gen 2 provider placement or the legacy schema-renderer path is an identical Gen 3 contract. See the [Gen 2 → Gen 3 migration guide](../migration-to-gen3.md) and [Gen 3 EngineProvider reference](https://github.com/Kastrick8/nextjs-engine/blob/docs/comprehensive-reference-main3/docs/3/module/engine-provider.md).
