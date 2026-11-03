# Schema and Type Reference

A Generation 2 page is a tree of schema nodes plus optional metadata, theme data and page-level configuration.

~~~ts
type SchemaNode = {
  type: string;
  key?: string;
  props?: Record<string, unknown>;
  children?: SchemaNode[] | string;
};

type PageSchema = {
  meta?: PageMeta;
  theme?: EngineTheme;
  root: SchemaNode;
};
~~~

This is a conceptual overview. Public TypeScript declarations in src/engine/schema/types.ts are authoritative for exact unions and prop shapes. Important type families include PageSchema, SchemaNode, PageMeta, EngineConfig, Breakpoint, ResponsiveValue, built-in node types, primitive props, form props, EngineScroll props and EngineShader schema types.

## Validation and analysis

- validateSchema() and validatePageSchema() validate schema input.
- analyzeNode(), analyzeSchema() and isSchemaValid() provide diagnostic analysis.
- [NE diagnostics](../ne/diagnostics.md) explains validation output.

See [Create API](./create.md), [Primitives](../module/primitives.md) and [Styling](../module/styling.md).
