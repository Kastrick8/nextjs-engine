# EngineDrawer

`EngineDrawer` is a modal panel attached to one screen edge. Use it for settings, inspectors, navigation panels, filters and mobile sheets.

## React usage

```tsx
"use client";

import { EngineDrawer } from "nextjs-engine";

export function SettingsDrawer() {
  return (
    <EngineDrawer
      triggerLabel="Settings"
      title="Project settings"
      side="right"
      size="28rem"
    >
      <p>Settings controls go here.</p>
    </EngineDrawer>
  );
}
```

## Placement and sizing

| Prop | Values / behavior |
|---|---|
| `side` | `left`, `right`, `top`, `bottom`; defaults to `right` |
| `size` | Width for left/right drawers; height for top/bottom drawers |
| `closeOnBackdrop` | Close when the backdrop is pressed |
| `lockScroll` | Lock document scrolling while open |
| `trapFocus` | Keep keyboard focus inside the drawer |
| `duration` | Transition duration in milliseconds |

A bottom drawer can serve as a mobile sheet; it uses the same shared modal/focus behavior.

## Controlled state

Use `open` and `onOpenChange` when application state owns visibility, or `defaultOpen` when EngineOverlay should own it.

## Related

- [Dialog](./dialog.md) for centered modal surfaces.
- [Popover](./popover.md) for non-modal anchored surfaces.
- [Shared runtime](./shared-runtime.md) for stacking and focus behavior.
