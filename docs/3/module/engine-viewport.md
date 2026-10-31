# EngineViewport

EngineViewport exposes Generation 3 viewport state through a public class/snapshot API and the `useEngineViewport()` hook.

## What it provides

- A current viewport snapshot.
- A React subscription hook.
- A shared interface for viewport-dependent Engine work.
- A boundary between viewport measurement and feature-specific behavior.

EngineViewport is separate from EngineDevice: device detection describes a request/device profile; viewport state describes the active rendered viewport.

See [EngineDevice and EngineMobile](./enginemobile.md), [EngineScroll](./enginescroll.md) and [Runtime](../ne/runtime.md). Use the exported `EngineViewportSnapshot` type for exact values in the installed version.
