# Styling — Generation 3

The Engine style system applies typed style props, responsive values, and pseudo-state rules to schema nodes. This page covers application-facing usage; CSS collection, compile-time resolution and cache behavior remain internal implementation details.

## Style a node

~~~ts
const card = {
  type: "card",
  props: {
    bg: "#111827",
    color: "#f9fafb",
    px: "1.5rem",
    py: "1rem",
    borderRadius: "12px",
    transform: "translateY(-2px)"
  }
};
~~~

Use the supported style properties from the Engine schema types. Layout, spacing, color, typography, border, size and transform properties are mapped into Engine's styling system.

## Responsive values

Responsive objects let the browser select a style at the relevant breakpoint:

~~~ts
{
  type: "grid",
  props: {
    columns: { xs: 1, md: 2, lg: 3 },
    gap: { xs: "1rem", md: "1.5rem" },
    px: { xs: "1rem", md: "2rem" }
  }
}
~~~

The supported breakpoint names are xs, sm, md, lg, xl and 2xl. Values are compiled to CSS variables/media-query rules; they do not require a JavaScript resize listener for ordinary responsive style props.

## Hover and focus states

~~~ts
{
  type: "button",
  props: {
    cprop: {
      onHover: { transform: "scale(1.02)" },
      onFocus: { outline: "2px solid #60a5fa" }
    }
  }
}
~~~

Pseudo-state bags are compiled to style classes for the supported states. They are styling rules, not an event subscription system.

## Precedence

~~~text
component defaults
  < variant defaults
  < schema props
  < explicit style
  < required runtime state
~~~

Explicit local styles override defaults. Required runtime behavior such as disabled control state remains protected.

## Related references

- [Create API](../api/create.md) for passing page-level EngineConfig.
- [EngineTheme](./enginetheme.md) for reusable theme tokens, component slots and variants.
- [Full styling guide](../styling.md).
- [Detailed styling internals](../styling-detailed.md).
- [NE runtime](../ne/runtime.md) for collection and execution ownership.
