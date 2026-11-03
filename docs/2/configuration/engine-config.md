# Engine Configuration

Page-level configuration is supplied through the config option on createPage() and createComponent(). It is distinct from Next.js plugin options such as configDir, endpointDir and shader build settings.

~~~tsx
import { createPage } from "nextjs-engine";
export default createPage({
  schema,
  config: {
    // Add EngineConfig options for this page.
  }
});
~~~

Generation 2 exposes BREAKPOINTS and BREAKPOINT_ORDER, plus useBreakpoint() and useMinBreakpoint() through EngineProvider. Responsive styling is property-specific; consult [Styling](../module/styling.md) rather than assuming every schema property supports responsive values.

| Concern | Configure it in |
|---|---|
| Responsive Engine behavior | createPage({ config }) |
| Named action handlers | createPage({ handlers }) |
| Named content slots | createPage({ slots }) |
| Mobile schema patches | createPage({ mobile }) |
| Provider endpoints/auth | .EngineAPIConfig/*.api |
| Static browser endpoints | data/endpoint/**/*.route |
| Build output paths | Engine plugin options in next.config.js |

See [Create API](../api/create.md), [Styling](../module/styling.md) and [EngineAPIResolver](./engine-api.md).
