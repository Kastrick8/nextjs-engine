# EngineScheduler

EngineScheduler is the Generation 3 public work-scheduling system. It publishes scheduling snapshots and supports policy-based work coordination.

## Public surface

| Export | Purpose |
|---|---|
| `EngineScheduler` | Scheduler implementation/API |
| `useEngineSchedule()` | Subscribe to scheduler information from React |
| `useEngineVisible()` | Read visibility/eligibility through the scheduler hook surface |
| `EngineSchedulePolicy` | Scheduling policy type |
| `EngineScheduleSnapshot` | Snapshot type |
| `EngineScheduleListener` | Listener contract |

## Observe work from React

`useEngineSchedule()` returns a ref to attach to the element being scheduled plus the latest immutable scheduling snapshot:

```tsx
"use client";

import { useEngineSchedule } from "nextjs-engine";

export function DeferredPreview() {
  const schedule = useEngineSchedule({
    nearMargin: "700px 0px",
    visibleThreshold: 0.01,
    releaseWhenFar: true,
  });

  return (
    <section ref={schedule.ref}>
      <p>Work state: {schedule.state}</p>
      <p>{schedule.visible ? "Visible" : schedule.near ? "Near viewport" : "Outside preload range"}</p>
      {schedule.underFramePressure ? <p>Deferring optional work</p> : null}
    </section>
  );
}
```

`useEngineSchedule(policy?)` returns `ref`, `state`, `near`, `visible`, and `underFramePressure`. The default policy is `{}`: `priority` is false, `nearMargin` is `"700px 0px"`, `visibleThreshold` is `0.01`, and `releaseWhenFar` is false.

| Policy field | Behavior |
| --- | --- |
| `priority` | `true` makes the work `critical` immediately and bypasses intersection deferral |
| `nearMargin` | CSS `rootMargin` used to mark work as near; default `"700px 0px"` |
| `visibleThreshold` | IntersectionObserver threshold for visible state; default `0.01` |
| `releaseWhenFar` | When true, work outside the near range becomes `sleeping`; otherwise it is `deferred` |

`useEngineVisible(priority?)` is the convenience form. It uses a `600px 0px` near margin and `releaseWhenFar: true`.

The snapshot state is one of `critical`, `visible`, `near`, `sleeping`, or `deferred`. `underFramePressure` is a separate signal; it does not change the visibility fields.

## Imperative scheduler surface

`EngineScheduler` is a shared runtime singleton. The principal public methods are:

| Method | Result | Purpose |
| --- | --- | --- |
| `observe(element, listener, policy?)` | `() => void` | Observe an element and receive `EngineScheduleSnapshot` updates |
| `isVisible(element, insetPx?)` | `boolean` | Synchronously test whether an element intersects the viewport after applying a non-negative inset |
| `isUnderFramePressure()` | `boolean` | Read the latest frame-pressure state |
| `subscribeFramePressure(listener)` | `() => void` | Subscribe to pressure changes |
| `acquireFrameMonitor()` | `() => void` | Acquire the shared refresh-aware RAF monitor; call the returned function to release it |
| `runWhenIdle(task, timeout?)` | `() => void` | Run when browser idle time is available and frame pressure has cleared; returned function cancels pending work |

`runWhenIdle()` defaults to a 1500 ms idle timeout. If frame pressure remains active, it retries after 120 ms rather than running the task under pressure. Browsers without `requestIdleCallback` use a bounded timeout fallback.

If `IntersectionObserver` is unavailable, `observe()` reports a visible/eligible snapshot instead of leaving work permanently deferred. Every `observe()` subscription and acquired frame monitor has an explicit cleanup function.

EngineScheduler reduces avoidable work and coordinates eligibility; it does not lower image, Canvas, Shader or video backing resolution to respond to frame pressure.

## Conceptual lifecycle

```text
work becomes eligible
      ↓
policy evaluates priority/visibility
      ↓
scheduler snapshot changes
      ↓
listeners / React hooks observe the update
```

Scheduler internals are runtime infrastructure. Application code should use the public scheduler/hook API rather than depending on internal task queues or private module state.

See [Runtime](../ne/runtime.md) for the broader work lifecycle and [Hooks](../api/hooks.md) for exported hook discovery.
