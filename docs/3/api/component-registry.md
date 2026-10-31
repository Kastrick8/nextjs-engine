# Component Registry API

The component registry maps schema node type identifiers to React components.

## Global registration

```tsx
import { registerComponent, unregisterComponent } from "nextjs-engine";
import { StatusBadge } from "./StatusBadge";

registerComponent("status-badge", StatusBadge);

// Call during application teardown only when the registration is no longer needed.
unregisterComponent("status-badge");
```

The built-in registry is used by the schema renderer. Application-owned node IDs should be stable, unique and safe identifiers. Generation 3 rejects attempts to replace or unregister built-in node types.

## Scoped registry (Generation 3)

Generation 3 also exposes an instance-scoped registry:

```tsx
import { createEngineComponentRegistry, createPage } from "nextjs-engine";
import { StatusBadge } from "./StatusBadge";

const registry = createEngineComponentRegistry();
registry.registerComponent("status-badge", StatusBadge);

export default createPage({
  schema,
  registry
});
```

A scoped registry starts with the built-ins and owns its custom registrations independently. This is useful when pages or application regions need explicit registration boundaries. In the current implementation, an explicit registry requires the Generation 3 server-first renderer.

## Public methods

| Method | Purpose |
|---|---|
| `registerComponent(type, component)` | Register an application-owned node type |
| `unregisterComponent(type)` | Remove an application-owned registration |
| `getComponent(type)` | Resolve a registered component |
| `hasComponent(type)` | Test whether a type is registered |
| `registeredTypes()` | List known node type IDs |
| `createEngineComponentRegistry()` | Create an isolated Generation 3 registry |

The Generation 2 registry is global and does not expose the scoped `EngineComponentRegistry` class or `createEngineComponentRegistry()`.

## Related

- [Create API](./create.md)
- [Custom components](../module/engine-custom-components.md)
- [Schema reference](./schema.md)
