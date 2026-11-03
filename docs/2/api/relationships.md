# How Public APIs Work Together — Generation 2

~~~text
PageSchema / EngineConfig
      ↓
createPage()
      ↓
EngineProvider + EngineScrollProvider
      ↓
validateSchema()
      ↓
SchemaRenderer
      ↓
global component registry
      ↓
built-in / registered React component
      ↓
StyleCollector + browser interaction
~~~

- `defineSchema()` preserves schema typing; it does not perform compilation.
- `createPage()` builds the page component and initializes provider/runtime context.
- `SchemaRenderer` resolves node types through the process-wide registry.
- `registerComponent()` adds trusted application React components to that registry.
- EngineProvider supplies config, handlers, slots, breakpoints and collected styles.

Generation 2 uses the client/provider renderer. It does not include the Generation 3 server-first compiler, client islands or scoped registry.

## Styling

`createPage({ config })` flows into EngineProvider context. Provider hooks expose context and breakpoint information, while style helpers and StyleCollector produce/emit the supported styles. Responsive support is property-specific; see [Styling](../module/styling.md).

## EngineAPIResolver and APIStatic

~~~text
.EngineAPIConfig/*.api
      ↓
compileAPIConfig() / ensureAPIConfig()
      ↓
providers + version macros
      ↓
EngineAPIResolver.resolveRequest()
      ├─ URL endpoint → fetch()
      └─ static descriptor → APIStatic.resolveRequest()
                                  ↓
                          manifest + browser module
                                  ↓
                           schema-checked operation
                                  ↓
                               Response
~~~

`ensureAPIConfig()` reads the `.EngineAPIConfig/*.api` directory if no compiled config was injected. The plugin's `.engine-api-compiled.json` is a separate build artifact, not the direct input to that helper. APIStatic routes execute in the browser and are not private server handlers.

## Other feature families

- EngineScroll combines provider/hook, points, movement, navigation, ranges, timelines, director and tracking.
- EngineTransitions+ combines presets, transition runner and navigation.
- EngineCanvas combines scene model, renderer registry and 2D/3D/SVG/Skia.
- EngineShader loads compiled shader assets and runs shader surfaces.
- EngineManim combines DSL parsing, easing/config compilation and animation routing.
- EngineOverlay Dialog/Drawer/Popover share stack, portal, focus and scroll locking.
- EngineBrowser exposes browser capabilities/actions; EngineDevice provides device detection and mobile hook.

See [module catalog](../module/index.md) and [exports](./exports.md). The Gen 2 server entrypoint is limited to device helpers; it has no EngineServer facade, CORS or NENC.
