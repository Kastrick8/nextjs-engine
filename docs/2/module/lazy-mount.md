# LazyMount and LazySection — Generation 2

> **Generation 2 · Stable 2.x** · Source branch: `main-2`.

`LazyMount` and `LazySection` are client-side React components for delaying the mount of below-the-fold content until its wrapper approaches the viewport. They are exported from `nextjs-engine`.

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

The child is not mounted until the wrapper enters the configured IntersectionObserver margin. The default `rootMargin` is `"600px 0px"`, allowing content to begin loading before it becomes visible. Observation is one-shot: once the child mounts, it stays mounted even if the wrapper later leaves the viewport.

| Prop | Default | Purpose |
|---|---|---|
| `children` | required | Content to mount after the visibility threshold is reached |
| `rootMargin` | `"600px 0px"` | IntersectionObserver distance around the viewport |
| `eager` | `false` | Start in the mounted state without waiting for intersection |
| `skeleton` | generated shimmer | Custom React fallback while content is not mounted or is suspended |
| `height` | — | Container minimum height; numeric values are pixels |
| `width` | `"100%"` | Container width; numeric values are pixels |
| `aspectRatio` | — | Reserve responsive media space |
| `className` / `style` | — | Wrapper styling |

A custom skeleton is useful for matching the geometry of the content that will replace it. If no skeleton is supplied, LazyMount renders a shimmer placeholder with a reduced-motion media rule.

## LazySection

`LazySection` wraps the same one-shot mount behavior and enables CSS `content-visibility` by default:

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
| `containIntrinsicHeight` | `height` or `"500px"` | Estimated intrinsic height for skipped rendering |
| all LazyMount props | — | Inherited loading, sizing, placeholder and observer controls |

Set `contentVisibility={false}` when the browser's content-visibility optimization is not appropriate for the section. `containIntrinsicHeight` is a layout estimate; choose a value close to the rendered content to reduce scroll-position shifts.

## Choosing a strategy

- Use `LazyMount` when the expensive React subtree itself should not mount until it is near the viewport.
- Use `LazySection` when you also want the browser to skip rendering work for off-screen descendants.
- Use `eager` for above-the-fold content or when application state already proves it should be mounted.
- Use a stable wrapper size or `aspectRatio` to reserve layout space while the child is absent.

These components defer mounting; they do not replace data authorization, server-side access checks, or application-level loading/error handling.

## Generation 3 note

The same components remain available in Gen 3, but the surrounding rendering architecture changes: eligible Engine schema trees may be compiled and rendered server-first. Do not infer that an entire Gen-2 provider-rendered page has the same Gen-3 client/server boundary. See [Migrating from Gen 2 to Gen 3](https://github.com/Kastrick8/nextjs-engine/blob/main-3/docs/3/guides/migrating-from-gen2.md).
