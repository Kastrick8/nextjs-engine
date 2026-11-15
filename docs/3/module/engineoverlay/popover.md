# EnginePopover

`EnginePopover` displays a non-modal panel anchored to its trigger. It is suited to contextual options, small menus and supplemental controls.

## React usage

```tsx
"use client";

import { EnginePopover } from "nextjs-engine";

export function MoreOptions() {
  return (
    <EnginePopover
      triggerLabel="More options"
      placement="bottom"
      align="end"
      offset={8}
    >
      <button type="button">Rename</button>
      <button type="button">Duplicate</button>
    </EnginePopover>
  );
}
```

## Positioning

| Prop | Purpose |
|---|---|
| `placement` | Preferred side: top, bottom, left or right |
| `align` | Alignment along the chosen side |
| `offset` | Gap between trigger and panel |
| `viewportPadding` | Minimum spacing from viewport edges |
| `matchTriggerWidth` | Match the trigger's usable width |
| `closeOnOutsideClick` | Close when a pointer press occurs outside trigger/panel |

The runtime measures the trigger and panel, responds to viewport/resize changes, tries the requested placement, flips when needed and clamps the result within the viewport.

## Modal behavior

Popover is non-modal by default: scroll locking and focus trapping are disabled unless explicitly enabled. Escape handling and focus restoration remain available through the shared contract.

See [shared runtime](./shared-runtime.md) and the [complete EngineOverlay reference](../engineoverlay.md).
