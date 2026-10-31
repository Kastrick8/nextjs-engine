# Generation 2 Runtime

Generation 2 uses the schema renderer and EngineProvider/context model to render component trees and coordinate browser interactions.

~~~text
PageSchema
   ↓
createPage()
   ↓
EngineProvider + EngineScrollProvider
   ↓
SchemaRenderer
   ↓
registered Engine component
   ↓
collected styles and browser interaction
~~~

| Area | Responsibility |
|---|---|
| SchemaRenderer | Resolve a schema tree against the global component registry |
| EngineProvider | Supply config, handlers, slots and provider context |
| EngineScrollProvider | Provide scroll state and navigation systems |
| Style collector | Deduplicate and emit collected Engine styles |
| Component registry | Map schema node IDs to built-in/custom React components |
| Lazy split points | Defer optional component modules until rendered |

This is the Generation 2 client/provider rendering architecture. Do not assume Generation 3 server-first compiler plans or client-island behavior are available here. See [Modules](../module/index.md) and the [existing runtime/performance reference](../runtime-performance.md).
