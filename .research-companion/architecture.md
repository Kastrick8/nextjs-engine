# Architecture Notes — Generation 2

## Page/render lifecycle
~~~text
PageSchema / EngineConfig
  → createPage()
  → EngineProvider + EngineScrollProvider
  → validateSchema()
  → SchemaRenderer
  → global registry lookup
  → built-in/custom React component
  → StyleCollector + browser interaction
~~~

## Module relationships
- Global component registry maps schema IDs to built-in/application React components.
- EngineProvider supplies page config, handlers, slots, breakpoints and style context.
- Style helpers/resolver turn supported schema props into CSS classes collected by StyleCollector.
- EngineScroll combines provider/hook, points, navigation, movement, ranges, timelines, director and tracking.
- EngineCanvas composes scene data, renderer registry and 2D/3D/SVG/Skia engines.
- EngineShader loads compiled shader assets into its runtime/surface.
- EngineManim composes DSL parser, animation config/easing and router for 2D/3D.
- EngineOverlay primitives share stack, portal, focus, Escape and scroll-lock runtime.
- EngineAPIResolver consumes provider config and can dispatch APIStatic descriptors.

## Source map
- Factories: `src/engine/createPage.tsx`
- Schema renderer/registry: `src/engine/core/SchemaRenderer.tsx`, `core/registry.ts`
- Components: `src/engine/components/`
- Runtime core: `src/engine/core/`
- Hooks/providers: `src/engine/hooks/`, `src/engine/providers/`
- Next.js plugins: `src/engine/plugins/`
- CLI: `bin/ne.js`, `bin/ne-cli/`

Only symbols re-exported by the root/server barrels are package APIs.
