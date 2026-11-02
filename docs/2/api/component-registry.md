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



## Generation 3 migration boundary

Generation 2 has one process-level registry. The Generation 3 `EngineComponentRegistry` class and `createEngineComponentRegistry()` factory are not exported in Gen 2; importing them in a 2.x project produces missing-export errors. Gen 3 scoped registries are isolated from the process-global compatibility registry and require the server-first renderer. Do not treat the Gen 3 scoped example as a Gen 2 drop-in. See the [migration guide](../migration-to-gen3.md) and [Gen 3 registry reference](https://github.com/Kastrick8/nextjs-engine/blob/main-3/docs/3/api/component-registry.md).
