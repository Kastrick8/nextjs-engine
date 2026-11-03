# Getting Started with Generation 2

~~~tsx
import { createPage, defineSchema } from "nextjs-engine";

const schema = defineSchema({
  meta: { title: "Hello Engine" },
  root: {
    type: "section",
    children: [
      { type: "heading", props: { content: "Hello, world!" } },
      { type: "text", props: { content: "A schema-driven page." } }
    ]
  }
});

export default createPage({ schema });
~~~

The conceptual tree is PageSchema → section → heading + text. Each node type identifies a built-in or registered component. See [Module catalog](../module/index.md), [Create API](../api/create.md), [Styling](../module/styling.md) and [EngineAPI configuration](../configuration/engine-api.md).
