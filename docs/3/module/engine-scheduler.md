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
