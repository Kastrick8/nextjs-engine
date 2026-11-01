# Custom Components — Generation 2

> **Generation 2 · Stable 2.x** · Custom nodes are trusted application-owned React components.

Generation 2 supports registering an ordinary React component under a schema node type. The registry is process-global:

```tsx
import { registerComponent, unregisterComponent } from "nextjs-engine";
import { StatusBadge } from "./StatusBadge";

registerComponent("status-badge", StatusBadge);

// Remove only when the application no longer needs this custom node.
unregisterComponent("status-badge");
```

The registered identifier is referenced in the schema:

```ts
const schema = {
  root: {
    type: "status-badge",
    props: { status: "ready" },
  },
};
```

Custom components are trusted local application code. Validate any data they receive, do not treat schema props as authorization, and keep private credentials/server capabilities out of client-rendered components. Use stable, unique node IDs and avoid replacing built-in node types.

For a reusable schema subtree, prefer `createComponent({ schema })`; direct registration is for a trusted React component that should be resolved as a schema node. See [Component Registry API](../api/component-registry.md) and [Create API](../api/create.md).

## Generation 3 migration

Generation 3 keeps direct trusted React registration but adds `createComponent({ mode: "custom", ... })`, which creates an adapter with an explicit prop/slot contract and optional EngineTheme metadata. The mode/custom adapter API is not a Gen 2 export contract; copying its options into Gen 2 causes type-checking errors. Gen 3 also adds isolated `EngineComponentRegistry` instances; those are absent from the Gen 2 public API. See the [Gen 2 → Gen 3 migration guide](../migration-to-gen3.md) and [Gen 3 custom component guide](https://github.com/Kastrick8/nextjs-engine/blob/docs/comprehensive-reference-main3/docs/3/module/engine-custom-components.md).
