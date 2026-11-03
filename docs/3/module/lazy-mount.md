# LazyMount and LazySection — Generation 3

> **Generation 3 · Alpha** · Both exports are client-side React components.

`LazyMount` and `LazySection` defer mounting a React subtree until the wrapper approaches or enters the viewport. They are explicit wrappers: importing the component does not automatically lazy-mount arbitrary descendants.

Generation 3 routes viewport observation through **EngineScheduler**, allowing lazy activation to share the same near/visible work policy and frame-pressure signal as other scheduled Engine work.

## LazyMount

```tsx
"use client";

import { LazyMount } from "nextjs-engine";

export function BelowFoldPreview() {
  return (
    <LazyMount
      height={320}
      rootMargin="600px 0px"
      skeleton={<div className="preview-skeleton" aria-hidden="true" />}
    >
      <HeavyPreview />
    </LazyMount>
  );
}
```

The wrapper reserves its configured size while the child is not mounted. By default, the observer considers the wrapper near when it enters a `600px 0px` margin. A default shimmer skeleton is used when no custom `skeleton` is supplied; the shimmer includes a reduced-motion rule.

| Prop | Default | Purpose |
|---|---|---|
| `children` | required | React subtree to mount after activation |
| `rootMargin` | `"600px 0px"` | Near-viewport margin passed to EngineScheduler |
| `eager` | `false` | Give this task priority and activate immediately |
| `skeleton` | generated shimmer | React fallback before activation and while children are suspended |
| `height` | — | Wrapper minimum height; numeric values are pixels |
| `width` | `"100%"` | Wrapper width; numeric values are pixels |
| `aspectRatio` | — | Reserve responsive media geometry |
| `className` / `style` | — | Wrapper styling |

## How Gen-3 activation works

`LazyMount` subscribes through `useEngineSchedule()` rather than owning an independent IntersectionObserver. The scheduler provides a state (`deferred`, `sleeping`, `near`, `visible`, or `critical`), near/visible flags, and a frame-pressure signal.

The child becomes activated when any of these conditions is true:

- the task is `critical` (the `eager`/priority path);
- the wrapper is visible;
- the wrapper is near **and** the scheduler is not under frame pressure.

This means Gen 3 can defer off-screen-near work while the scheduler reports frame pressure, rather than mounting every nearby subtree at once. Once activated, the component keeps its mounted state; leaving the viewport does not unmount the child. When `IntersectionObserver` is unavailable, the scheduler falls back to an immediately visible state so the content is not left permanently deferred.

The scheduler's frame-pressure policy coordinates work admission; it does not lower image, Canvas, Shader or video resolution as a substitute for frame delivery. See [EngineScheduler](./engine-scheduler.md) and [useEngineSchedule](../api/hooks.md).

## LazySection

`LazySection` wraps `LazyMount` and enables CSS `content-visibility` by default:

```tsx
"use client";

import { LazySection } from "nextjs-engine";

export function LongDashboard() {
  return (
    <LazySection
      height={640}
      contentVisibility
      containIntrinsicHeight="640px"
    >
      <ExpensiveDashboardSection />
    </LazySection>
  );
}
```

| Prop | Default | Purpose |
|---|---|---|
| `contentVisibility` | `true` | Apply `content-visibility: auto` to the wrapper |
| `containIntrinsicHeight` | `height` or `"500px"` | Estimated intrinsic height used while skipped content is not laid out |
| All `LazyMount` props | — | Inherit the activation, placeholder and sizing controls |

Set `contentVisibility={false}` when that browser optimization is not appropriate for the section. `containIntrinsicHeight` is a layout estimate, not the child's measured height; choose a realistic value to reduce scroll-position shifts.

## Choosing a strategy

- Use `LazyMount` when the React subtree itself should not mount until it is near/visible.
- Use `LazySection` when you also want the browser to skip rendering work for off-screen descendants.
- Use `eager` for above-the-fold content or content that must activate immediately.
- Use a stable wrapper size or `aspectRatio` to reserve layout space while the child is absent.
- Use the EngineScheduler API when the application needs to observe or coordinate a larger set of scheduled viewport tasks.

These components defer mounting; they do not replace data authorization, server-side access checks, or application-level loading/error handling. They are client components and should be composed at the relevant React client boundary.

## Generation 2 compatibility

The same component names and primary props exist in Generation 2, but the activation implementation differs. Gen 2 uses a one-shot `useInView` observer; Gen 3 routes observation through EngineScheduler and can defer near-but-not-visible activation under frame pressure. Do not assume identical activation timing when moving a page between generations. See [Gen 2 LazyMount and LazySection](https://github.com/Kastrick8/nextjs-engine/blob/main-2/docs/2/module/lazy-mount.md) and [Migrating from Gen 2](../guides/migrating-from-gen2.md).

Related: [EngineScheduler](./engine-scheduler.md) · [Hooks API](../api/hooks.md) · [Runtime](../ne/runtime.md).
