# EngineViewport

EngineViewport exposes Generation 3 viewport state through a public class/snapshot API and the `useEngineViewport()` hook.

## What it provides

- A current viewport snapshot.
- A React subscription hook.
- A shared interface for viewport-dependent Engine work.
- A boundary between viewport measurement and feature-specific behavior.

## Snapshot contract

The public `EngineViewportSnapshot` contains:

| Field | Meaning |
| --- | --- |
| `width`, `height` | Visual viewport dimensions in CSS pixels |
| `layoutWidth`, `layoutHeight` | Layout viewport dimensions in CSS pixels (`window.innerWidth` / `innerHeight`) |
| `offsetLeft`, `offsetTop` | Visual viewport offset within the layout viewport |
| `scale` | Visual viewport scale |
| `orientation` | `"landscape"` when width is at least height; otherwise `"portrait"` |
| `keyboardInset` | Non-negative estimate from layout height minus visual height and visual top offset |

On the server, the stable snapshot is `{ width: 0, height: 0, layoutWidth: 0, layoutHeight: 0, offsetLeft: 0, offsetTop: 0, scale: 1, orientation: "portrait", keyboardInset: 0 }`. The keyboard inset is a viewport-geometry estimate, not a definitive keyboard-state API.

## Read it in React

```tsx
"use client";

import { useEngineViewport } from "nextjs-engine";

export function ViewportReadout() {
  const viewport = useEngineViewport();
  return (
    <output>
      {viewport.width} × {viewport.height}
      {viewport.keyboardInset > 0 ? ` · inset ${viewport.keyboardInset}px` : ""}
    </output>
  );
}
```

`useEngineViewport()` subscribes through React's external-store API and returns the current snapshot. It is a Client Component hook.

## Imperative surface

| Member | Result | Purpose |
| --- | --- | --- |
| `EngineViewport.getSnapshot()` | `EngineViewportSnapshot` | Read the latest client snapshot |
| `EngineViewport.getServerSnapshot()` | `EngineViewportSnapshot` | Read the stable SSR/hydration snapshot |
| `EngineViewport.subscribe(listener)` | `() => void` | Subscribe to changes; the first subscriber starts measurement and the last unsubscribe stops listeners |

The runtime listens for window resize/orientation changes and visual viewport resize/scroll events. Measurements are coalesced through one animation frame and subscribers are notified only when a snapshot field changes.

EngineViewport is separate from EngineDevice: device detection describes a request/device profile; viewport state describes the active rendered viewport.

See [EngineDevice and EngineMobile](./enginemobile.md), [EngineScroll](./enginescroll.md) and [Runtime](../ne/runtime.md). Use the exported `EngineViewportSnapshot` type for exact values in the installed version.
