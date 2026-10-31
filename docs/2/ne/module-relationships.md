# Generation 2 Module Relationships

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
global registry
      ↓
built-in/custom React component
      ↓
StyleCollector + browser interaction
~~~

| Feature | Supporting internals | Relationship |
|---|---|---|
| Primitives/UI | component files + style hooks | Shared provider context and StyleCollector |
| Registry | `core/registry.ts` | Process-level schema ID → React component mapping |
| Styling | `usePropStyles.ts`, `resolver.ts`, `StyleCollector.ts` | Style resolution → CSS classes → provider emission |
| EngineScroll | `core/enginescroll/` | Provider, points, navigation, movement, range, timeline, director, tracker |
| EngineCanvas | `core/enginecanvas/` | Scene model, renderer registry, 2D/3D/SVG/Skia |
| EngineShader | `core/engineshader/` + shader plugin | Compiled manifest → runtime/surface |
| EngineManim | `components/EngineManim/` | DSL parser → config/easing → animation router → 2D/3D components |
| EngineOverlay | `components/EngineOverlay/` + overlay core | Shared stack, portal, focus and scroll-lock runtime |
| EngineTransitions+ | `core/enginetransitions/` | Presets, transition runner, navigation |
| EngineAPIResolver/APIStatic | parser, resolver, runtime and API plugin | Provider config → resolver → fetch or static browser endpoint |
| EngineBrowser/Device | browser facade + shared UA parser | Browser capabilities, interaction and device profile |

The Generation 2 `withEngine()` plugin composes API and shader plugins. API build reads `.EngineAPIConfig/*.api`, writes `.engine-api-compiled.json`, compiles `data/endpoint/**/*.route` and writes artifacts beneath `public/_static/endpoint`.

This branch has no Generation 3 compiler, EngineTheme factory, EngineSEO, EngineDebug, NENC, EngineCookies, EngineCORS, EngineScheduler, EngineModel or EngineViewport.
