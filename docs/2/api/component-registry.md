# Component Registry API

Generation 2 provides one process-level component registry used by the schema renderer.

~~~tsx
import { registerComponent, unregisterComponent } from "nextjs-engine";
import { StatusBadge } from "./StatusBadge";

registerComponent("status-badge", StatusBadge);
unregisterComponent("status-badge"); // when the custom registration is no longer needed
~~~

| Function | Purpose |
|---|---|
| registerComponent(type, component) | Register a React component for a schema node ID |
| unregisterComponent(type) | Remove a registration |
| getComponent(type) | Resolve a component by node type |
| hasComponent(type) | Test whether a registration exists |
| registeredTypes() | List registered node IDs |

The registry is global. It does not offer the Generation 3 EngineComponentRegistry class or createEngineComponentRegistry(). Use stable custom node IDs and trusted application code. See [Custom components](../module/engine-custom-components.md).
