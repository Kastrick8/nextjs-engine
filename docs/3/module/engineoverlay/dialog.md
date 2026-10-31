# EngineDialog

`EngineDialog` is the modal primitive for confirmations, prompts, editors and other interactions that require a modal decision surface.

## React usage

```tsx
"use client";

import { EngineDialog } from "nextjs-engine";

export function DeleteAction() {
  return (
    <EngineDialog
      triggerLabel="Delete project"
      title="Delete this project?"
      description="This action cannot be undone."
      actions={[
        { label: "Cancel", variant: "ghost" },
        { label: "Delete", variant: "danger", onClick: "deleteProject" }
      ]}
    >
      The project and its associated resources will be removed.
    </EngineDialog>
  );
}
```

When using named schema handlers, declare the corresponding handler in `createPage({ handlers })`.

## Behavior

| Concern | Default / contract |
|---|---|
| Modal | Yes; `aria-modal="true"` |
| Role | `dialog`; may be `alertdialog` |
| Backdrop close | Enabled |
| Escape close | Enabled |
| Body scroll lock | Enabled |
| Focus trap | Enabled |
| Focus restoration | Enabled |
| Close button | Shown by default |
| Portal | `document.body` unless `portalTargetId` is supplied |

## Controlled state

```tsx
<EngineDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  triggerLabel="Open"
  title="Settings"
/>
```

Use `defaultOpen` for uncontrolled state. `onOpenChange` receives the next boolean state.

## Accessibility

Provide a visible `title` or an `ariaLabel`. Use descriptive action labels and keep keyboard focus within the modal while it is open. Reduced-motion preferences are respected by the shared overlay behavior.

See [shared runtime](./shared-runtime.md) and the [full EngineOverlay reference](../engineoverlay.md).
