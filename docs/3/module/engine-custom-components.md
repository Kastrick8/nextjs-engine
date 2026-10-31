# Custom Engine Components

Generation 3 supports application-owned React components registered under a schema node type. Keep the implementation in trusted local application code; the registry connects the schema node ID to the React component.

## Create a custom component adapter

The explicit custom mode adds a runtime prop/slot contract to a trusted local React component:

~~~tsx
import { createComponent, registerComponent } from "nextjs-engine";
import { StatusBadgeView } from "./StatusBadgeView";

const StatusBadge = createComponent({
  mode: "custom",
  id: "status-badge",
  theme: "site.status-badge",
  component: StatusBadgeView,
  props: {
    status: {
      type: "string",
      required: true,
      enum: ["ready", "pending", "failed"]
    }
  },
  slots: ["children"],
  strictProps: true
});

registerComponent("status-badge", StatusBadge);
~~~

The adapter factory does not register the component by itself. Register it explicitly with the matching ID, then use that ID as the schema node type.

## Direct registration

For a simple trusted component without the custom prop-schema adapter:

~~~tsx
import { registerComponent } from "nextjs-engine";
import { StatusBadge } from "./StatusBadge";

registerComponent("status-badge", StatusBadge);
~~~

Use the registered type in a schema:

~~~ts
const schema = {
  root: {
    type: "status-badge",
    props: { status: "ready" }
  }
};
~~~

## Scoped registry

~~~tsx
import {
  createEngineComponentRegistry,
  createPage
} from "nextjs-engine";
import { StatusBadge } from "./StatusBadge";

const registry = createEngineComponentRegistry();
registry.registerComponent("status-badge", StatusBadge);

export default createPage({
  schema,
  registry
});
~~~

A scoped registry starts with built-ins and owns its custom registrations independently. Generation 3 prevents application registrations from replacing or unregistering built-in node types. A scoped registry must be used with the server-first page path.

## Component theming

EngineTheme can associate a custom component type with a theme namespace through the custom-component metadata contract. Theme data provides validated CSS values for the root and declared slots; it does not provide executable component code, event handlers or arbitrary behavior.

See [EngineTheme](./enginetheme.md) for custom-component theme bindings and [Component Registry API](../api/component-registry.md) for registry methods.

## Security and ownership

- Treat registered React components as trusted application code.
- Do not load executable components from remote theme artifacts.
- Do not pass server handlers or private secrets into client component props.
- Choose stable node IDs and keep their registration consistent across the app.
- Prefer schema-composition createComponent() when a reusable schema subtree is sufficient; use custom mode for a trusted React component with a declared prop contract.
