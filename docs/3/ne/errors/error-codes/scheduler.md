# EngineScheduler and runtime coordination

**Prefix:** `NESCHED`  
**Scope:** Scheduling policies, target lifecycle, observers, callbacks and frame budgets

## Code index

| Code | Diagnostic | Status |
|---|---|---|
| [NESCHED1001](#nesched1001) | Scheduling policy invalid | Assigned |
| [NESCHED1002](#nesched1002) | EngineScroll point metadata has no target | Emitted |
| [NESCHED2001](#nesched2001) | Scheduled target unavailable | Assigned |
| [NESCHED4001](#nesched4001) | Scheduled callback threw | Assigned |
| [NESCHED4002](#nesched4002) | Browser observer unavailable | Assigned |
| [NESCHED5001](#nesched5001) | Scheduler exceeded expected work budget | Assigned |

## Details

### NESCHED1001

**Scheduling policy invalid**

**Status:** Assigned

**What it means**

A policy contains unsupported or out-of-range options.

**Why it happens**

Threshold/timing/priority may violate typed contract.

**Recommended action**

Use documented finite values instead of tuning around a broken task.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/scheduler#nesched1001`

---

### NESCHED2001

**Scheduled target unavailable**

**Status:** Assigned

**What it means**

A task refers to a detached/disposed target.

**Why it happens**

Unmount/navigation or stale observer callbacks can leave pending work.

**Recommended action**

Cancel work on disposal and make cleanup idempotent.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/scheduler#nesched2001`

---

### NESCHED4001

**Scheduled callback threw**

**Status:** Assigned

**What it means**

A callback invoked by scheduler work raised an exception.

**Why it happens**

Application callback/lifecycle cleanup may be faulty.

**Recommended action**

Fix the callback at its source frame; later subscribers should still run.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/scheduler#nesched4001`

---

### NESCHED4002

**Browser observer unavailable**

**Status:** Assigned

**What it means**

The requested observer/API is missing in the current runtime.

**Why it happens**

Code may run in SSR/test or browser without the capability.

**Recommended action**

Use documented fallback and never access browser globals during server render.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/scheduler#nesched4002`

---

### NESCHED5001

**Scheduler exceeded expected work budget**

**Status:** Assigned

**What it means**

Queued/running work exceeded a timing/volume target.

**Why it happens**

Expensive callbacks or repeated scheduling may cause frame pressure.

**Recommended action**

Inspect task owner/priority, reduce repeated work and defer noncritical tasks.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/scheduler#nesched5001`

---


### NESCHED1002

**EngineScroll point metadata has no target**

**Status:** Emitted

**What it means**

A node defines pointGroup, pointAlign or pointOffset without a non-empty point name.

**Why it happens**

These options modify a registered EngineScroll point; they do not create a point target on their own.

**Recommended action**

Add props.point or remove pointGroup/pointAlign/pointOffset. The schema path identifies the affected node.

**Help URL**

`https://kastrick.vercel.app/project/nextjs-engine/doc/error-codes/scheduler#nesched1002`

---

