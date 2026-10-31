# Schema and Type Reference

A page schema describes metadata and a root node tree. Each node identifies a registered component type, optional props, and optional children.

```ts
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
```

The shape above is a conceptual overview. The exported TypeScript declarations in `src/engine/schema/types.ts` are the authoritative contract for exact unions and component-specific props.

## Shared schema concepts

| Concept | Purpose |
|---|---|
| `type` | Built-in or registered schema node identifier |
| `key` | Stable identity for repeated child nodes |
| `props` | Component-specific and supported shared properties |
| `children` | Nested schema nodes or text |
| `meta` | Page metadata, canonical information and social preview values |
| `theme` | Page-level theme declaration where supported |

## Type families

The public type barrel includes page/schema types, built-in node types, breakpoints, responsive values, primitive props, form props, scroll props, shader props and EngineTheme definitions.

Use the relevant module page for component props instead of duplicating every component table here.

## Validation

`validateSchema()` and `validatePageSchema()` provide schema validation. `analyzeNode()`, `analyzeSchema()` and `isSchemaValid()` provide analyzer-oriented diagnostics. See [NE diagnostics](../ne/diagnostics.md).

## Related

- [Create API](./create.md)
- [Primitives](../module/primitives.md)
- [Styling](../module/styling.md)
- [Schema diagnostics](../ne/diagnostics.md)
